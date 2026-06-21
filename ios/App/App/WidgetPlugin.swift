import Foundation
import Capacitor
import WidgetKit

/**
 * WidgetPlugin — hands the JS-computed widget snapshot to the native side.
 *
 * Madoromi's sleep log lives in the web layer; this plugin is the one-way pipe
 * that lets a Home Screen widget render today's thinking condition and sleep
 * debt without the extension ever touching app internals. On each `reload` it
 * writes the snapshot JSON into the shared App Group container and asks
 * WidgetKit to refresh its timelines.
 *
 * Wiring (Xcode, once):
 * - Add the App Group `group.app.madoromi` capability to BOTH the App target
 *   and the widget extension target (it is already declared in the App's
 *   entitlements file).
 * - Add the MadoromiWidget extension target (see ios/App/MadoromiWidget).
 * Until the App Group exists, `sharedDefaults` is nil and calls no-op cleanly;
 * the JS wrapper in `src/lib/widget.ts` swallows anything that slips through.
 */
@objc(WidgetPlugin)
public class WidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetPlugin"
    public let jsName = "Widget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
    ]

    /// Shared with the widget extension. Must match the App Group on both targets.
    static let appGroup = "group.app.madoromi"
    static let snapshotKey = "widgetSnapshot"

    @objc func reload(_ call: CAPPluginCall) {
        guard let snapshot = call.getObject("snapshot") else {
            call.reject("Missing snapshot")
            return
        }
        guard let defaults = UserDefaults(suiteName: WidgetPlugin.appGroup) else {
            // App Group not configured yet — succeed quietly, nothing to render.
            call.resolve()
            return
        }
        do {
            let data = try JSONSerialization.data(withJSONObject: snapshot)
            defaults.set(data, forKey: WidgetPlugin.snapshotKey)
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            call.resolve()
        } catch {
            call.reject(error.localizedDescription, nil, error)
        }
    }
}
