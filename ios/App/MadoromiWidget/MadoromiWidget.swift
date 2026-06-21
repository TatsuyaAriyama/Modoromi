import WidgetKit
import SwiftUI

/**
 * MadoromiWidget — a quiet Home Screen widget showing today's thinking
 * condition and trailing sleep debt. It reads a snapshot the app publishes into
 * the shared App Group (see WidgetPlugin); it never computes sleep itself, so it
 * can never disagree with the app. Dark-first and minimal, matching the brand:
 * a single number framed as a 目安, never a verdict.
 *
 * This is a standalone extension target. To wire it in Xcode (once):
 * 1. File ▸ New ▸ Target ▸ Widget Extension, name "MadoromiWidget".
 * 2. Replace the generated sources with the files in this folder.
 * 3. Add the App Group `group.app.madoromi` capability to this target.
 */

// MARK: - Shared snapshot (mirrors src/domain/widgetSnapshot.ts)

struct WidgetSnapshot: Codable {
    var conditionIndex: Int
    var tier: String          // sharp | steady | foggy | depleted
    var debtMin: Int
    var debtStatus: String    // good | mild | notable
    var lastQuality: Int?
    var hasData: Bool
    var updatedAt: String

    static let placeholder = WidgetSnapshot(
        conditionIndex: 72, tier: "steady", debtMin: 45, debtStatus: "mild",
        lastQuality: 78, hasData: true, updatedAt: ""
    )

    static let empty = WidgetSnapshot(
        conditionIndex: 60, tier: "steady", debtMin: 0, debtStatus: "good",
        lastQuality: nil, hasData: false, updatedAt: ""
    )
}

enum SnapshotStore {
    static let appGroup = "group.app.madoromi"
    static let key = "widgetSnapshot"

    static func load() -> WidgetSnapshot {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let data = defaults.data(forKey: key),
              let snap = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
        else { return .empty }
        return snap
    }
}

// MARK: - Timeline

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: SnapshotStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let entry = SnapshotEntry(date: Date(), snapshot: SnapshotStore.load())
        // The app pushes fresh data on every log; refresh a few times a day as a
        // backstop so debt/condition don't read stale if the app isn't opened.
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

// MARK: - View

struct MadoromiWidgetEntryView: View {
    var entry: SnapshotEntry

    private var tierColor: Color {
        switch entry.snapshot.tier {
        case "sharp": return Color(red: 0.55, green: 0.78, blue: 0.92)
        case "steady": return Color(red: 0.62, green: 0.72, blue: 0.85)
        case "foggy": return Color(red: 0.80, green: 0.74, blue: 0.55)
        default: return Color(red: 0.85, green: 0.55, blue: 0.62)
        }
    }

    private var debtText: String {
        let h = entry.snapshot.debtMin / 60
        let m = entry.snapshot.debtMin % 60
        if entry.snapshot.debtMin <= 0 { return "Rested" }
        return h > 0 ? "\(h)h \(m)m debt" : "\(m)m debt"
    }

    var body: some View {
        ZStack {
            Color(red: 0.07, green: 0.08, blue: 0.11)
            if entry.snapshot.hasData {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Condition")
                        .font(.caption2)
                        .foregroundColor(.gray)
                    Text("\(entry.snapshot.conditionIndex)")
                        .font(.system(size: 40, weight: .semibold, design: .rounded))
                        .foregroundColor(tierColor)
                    Text(debtText)
                        .font(.caption)
                        .foregroundColor(.gray)
                    Spacer()
                }
                .padding(14)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else {
                VStack(spacing: 4) {
                    Text("Madoromi")
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.9))
                    Text("Log a night to begin")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                .padding(14)
            }
        }
    }
}

// MARK: - Widget

@main
struct MadoromiWidget: Widget {
    let kind = "MadoromiWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                MadoromiWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                MadoromiWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Madoromi")
        .description("Today's thinking condition and sleep debt.")
        .supportedFamilies([.systemSmall])
    }
}
