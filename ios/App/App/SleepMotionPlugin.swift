import Foundation
import Capacitor
import CoreMotion

/**
 * SleepMotionPlugin — background body-movement recording for a sleep session.
 *
 * The web DeviceMotion stream stops the moment the screen locks, so it can't
 * track a real night. `CMSensorRecorder` instead records the accelerometer to
 * the motion coprocessor's buffer *even while the app is suspended*; on wake we
 * read back the slice for the session and reduce it to a compact movement list.
 *
 * The detection (gravity removal, threshold, debounce) is kept in lockstep with
 * `src/domain/motionDetect.ts` so iOS, Android and web agree. CMSensorRecorder
 * accelerometer samples are in g, so they're scaled to m/s² to match.
 *
 * Wiring (Xcode, once): add this file to the App target, ensure the Motion
 * usage string (NSMotionUsageDescription) is in Info.plist. Capacitor
 * auto-discovers the plugin via the CAPBridgedPlugin conformance — no JS
 * registration change.
 */
@objc(SleepMotionPlugin)
public class SleepMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SleepMotionPlugin"
    public let jsName = "SleepMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private let recorder = CMSensorRecorder()
    private var startDate: Date?

    // Detection constants — keep in lockstep with src/domain/motionDetect.ts.
    private let threshold = 1.2       // m/s² of linear acceleration
    private let debounceMs = 4000.0
    private let gravityTauMs = 600.0
    private let maxDtMs = 1000.0
    private let gToMs2 = 9.81

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": CMSensorRecorder.isAccelerometerRecordingAvailable()])
    }

    @objc func start(_ call: CAPPluginCall) {
        guard CMSensorRecorder.isAccelerometerRecordingAvailable() else {
            call.reject("Accelerometer recording unavailable")
            return
        }
        startDate = Date()
        // Record in the background for up to ~12h; we read back only what we need.
        recorder.recordAccelerometer(forDuration: 12 * 60 * 60)
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard let from = startDate else {
            call.resolve(["movements": []])
            return
        }
        let to = Date()
        startDate = nil
        // The buffer can hold hours of samples — reduce it off the main thread.
        DispatchQueue.global(qos: .utility).async { [weak self] in
            let movements = self?.detect(from: from, to: to) ?? []
            call.resolve(["movements": movements])
        }
    }

    private func detect(from: Date, to: Date) -> [[String: Any]] {
        guard let data = recorder.accelerometerData(from: from, to: to) else { return [] }
        let startMs = from.timeIntervalSince1970 * 1000

        var gx = 0.0, gy = 0.0, gz = 0.0
        var primed = false
        var prevT = 0.0
        var lastEventT = -Double.greatestFiniteMagnitude
        var out: [[String: Any]] = []

        for element in data {
            guard let sample = element as? CMRecordedAccelerometerData else { continue }
            let t = sample.startDate.timeIntervalSince1970 * 1000
            let x = sample.acceleration.x * gToMs2
            let y = sample.acceleration.y * gToMs2
            let z = sample.acceleration.z * gToMs2
            if !primed {
                gx = x; gy = y; gz = z
                primed = true
                prevT = t
                continue
            }
            let dt = min(maxDtMs, max(1.0, t - prevT))
            prevT = t
            let alpha = dt / (gravityTauMs + dt)
            gx += alpha * (x - gx)
            gy += alpha * (y - gy)
            gz += alpha * (z - gz)
            let lx = x - gx, ly = y - gy, lz = z - gz
            let mag = (lx * lx + ly * ly + lz * lz).squareRoot()
            if mag < threshold { continue }
            if t - lastEventT < debounceMs { continue }
            lastEventT = t
            let minutes = max(0.0, ((t - startMs) / 60000).rounded())
            out.append([
                "t": Int(minutes),
                "magnitude": (mag * 100).rounded() / 100,
            ])
        }
        return out
    }
}
