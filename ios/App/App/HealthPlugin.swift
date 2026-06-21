import Foundation
import Capacitor
import HealthKit

/**
 * HealthPlugin — a small bridge between Madoromi and Apple Health
 * (HKCategoryTypeSleepAnalysis).
 *
 * Design notes:
 * - Two independent, opt-in directions: a write *mirror* (share authorization,
 *   `saveSleep`) that pushes confirmed nights out as `.inBed`, and an on-demand
 *   *import* (read authorization, `readSleep`) that pulls sleep tracked
 *   elsewhere. Madoromi's local log stays the source of truth; imported nights
 *   are de-duplicated against it on the JS side (`domain/healthImport`).
 * - Best-effort. The JS wrappers in `src/lib/health.ts` swallow rejections, so
 *   any failure here (HealthKit absent, permission denied, query/save error)
 *   degrades to a no-op without disturbing app flows.
 *
 * Wiring (Xcode, once): add this file to the App target, enable the HealthKit
 * capability (adds `com.apple.developer.healthkit` to the entitlements), and
 * keep both the NSHealthUpdateUsageDescription (write) and
 * NSHealthShareUsageDescription (read) strings in Info.plist. Capacitor
 * auto-discovers the plugin via the CAPBridgedPlugin conformance below.
 */
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveSleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReadAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readSleep", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    // Parse/emit ISO-8601 with fractional seconds — JS `Date.toISOString()`
    // always includes milliseconds, so the formatter must too.
    private let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

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

    @objc func requestReadAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(), let sleepType = sleepType else {
            call.resolve(["granted": false])
            return
        }
        store.requestAuthorization(toShare: [], read: [sleepType]) { success, _ in
            // HealthKit hides read-permission decisions for privacy: `success`
            // only means the prompt completed. A denied read simply returns no
            // samples, which the importer treats as "nothing to import".
            call.resolve(["granted": success])
        }
    }

    @objc func readSleep(_ call: CAPPluginCall) {
        guard let sleepType = sleepType,
              let startISO = call.getString("startISO"),
              let endISO = call.getString("endISO"),
              let start = isoFormatter.date(from: startISO),
              let end = isoFormatter.date(from: endISO),
              end > start
        else {
            call.reject("Invalid range")
            return
        }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(
            sampleType: sleepType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sort]
        ) { [weak self] _, results, error in
            if let error = error {
                call.reject(error.localizedDescription, nil, error)
                return
            }
            let formatter = self?.isoFormatter ?? ISO8601DateFormatter()
            let samples: [[String: Any]] = (results as? [HKCategorySample] ?? []).map { s in
                [
                    "startISO": formatter.string(from: s.startDate),
                    "endISO": formatter.string(from: s.endDate),
                    "value": s.value,
                ]
            }
            call.resolve(["samples": samples])
        }
        store.execute(query)
    }
}
