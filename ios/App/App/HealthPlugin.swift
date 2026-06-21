import Foundation
import Capacitor
import HealthKit

/**
 * HealthPlugin — a small one-way bridge that mirrors Madoromi's confirmed sleep
 * sessions into Apple Health (HKCategoryTypeSleepAnalysis, `.inBed`).
 *
 * Design notes:
 * - Write-only. We request *share* (write) authorization for sleep analysis and
 *   never request read access — Madoromi's local log stays the source of truth.
 * - Best-effort. The JS wrappers in `src/lib/health.ts` swallow rejections, so
 *   any failure here (HealthKit absent, permission denied, save error) degrades
 *   to a no-op without disturbing the morning flow.
 *
 * Wiring (Xcode, once): add this file to the App target, enable the HealthKit
 * capability (adds `com.apple.developer.healthkit` to the entitlements), and
 * keep the NSHealth* usage strings in Info.plist. Capacitor auto-discovers the
 * plugin via the CAPBridgedPlugin conformance below — no JS registration change.
 */
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveSleep", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    private let isoFormatter = ISO8601DateFormatter()

    private var sleepType: HKCategoryType? {
        HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable() && sleepType != nil])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let sleepType = sleepType else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: [sleepType], read: []) { success, _ in
            // `success` reflects that the prompt completed, not the user's choice
            // (HealthKit hides write-denials). Treat a clean completion as granted;
            // a later save simply no-ops if the user actually declined.
            call.resolve(["granted": success])
        }
    }

    @objc func saveSleep(_ call: CAPPluginCall) {
        guard let sleepType = sleepType,
              let startISO = call.getString("startISO"),
              let endISO = call.getString("endISO"),
              let start = isoFormatter.date(from: startISO),
              let end = isoFormatter.date(from: endISO),
              end > start
        else {
            call.reject("Invalid sleep sample")
            return
        }

        let sample = HKCategorySample(
            type: sleepType,
            value: HKCategoryValueSleepAnalysis.inBed.rawValue,
            start: start,
            end: end
        )

        store.save(sample) { success, error in
            if let error = error {
                call.reject(error.localizedDescription, nil, error)
            } else if success {
                call.resolve()
            } else {
                call.reject("Sleep sample was not saved")
            }
        }
    }
}
