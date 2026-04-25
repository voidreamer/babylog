import WidgetKit
import SwiftUI

struct BabyEntry: TimelineEntry {
    let date: Date
    let babyName: String?
    let lastFeedingAt: Date?
    let lastDiaperAt: Date?
    let currentSleepStart: Date?
    let lastSleepEnd: Date?
    let isSignedIn: Bool
}

struct BabyProvider: TimelineProvider {
    func placeholder(in context: Context) -> BabyEntry {
        BabyEntry(date: .now, babyName: "Baby",
                  lastFeedingAt: .now.addingTimeInterval(-3600),
                  lastDiaperAt: .now.addingTimeInterval(-1800),
                  currentSleepStart: nil,
                  lastSleepEnd: .now.addingTimeInterval(-7200),
                  isSignedIn: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyEntry) -> Void) {
        Task { completion(await load()) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyEntry>) -> Void) {
        Task {
            let entry = await load()
            // Refresh every 15 min; intents call WidgetCenter.reloadTimelines on writes.
            let next = Date().addingTimeInterval(15 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func load() async -> BabyEntry {
        let client = BabylogClient.shared
        let signedIn = SharedKeychain.read(key: SharedKeys.accessToken) != nil
        guard signedIn, client.selectedBabyId != nil else {
            return BabyEntry(date: .now, babyName: nil,
                             lastFeedingAt: nil, lastDiaperAt: nil,
                             currentSleepStart: nil, lastSleepEnd: nil,
                             isSignedIn: false)
        }
        do {
            let snap = try await client.fetchDashboard()
            return BabyEntry(date: .now,
                             babyName: client.selectedBabyName,
                             lastFeedingAt: snap.lastFeedingAt,
                             lastDiaperAt: snap.lastDiaperAt,
                             currentSleepStart: snap.currentSleepStart,
                             lastSleepEnd: snap.lastSleepEnd,
                             isSignedIn: true)
        } catch {
            return BabyEntry(date: .now,
                             babyName: client.selectedBabyName,
                             lastFeedingAt: nil, lastDiaperAt: nil,
                             currentSleepStart: nil, lastSleepEnd: nil,
                             isSignedIn: true)
        }
    }
}

// MARK: - Shared UI helpers

enum WidgetTheme {
    static let bg = Color(red: 0.094, green: 0.094, blue: 0.106) // #18181b
    static let accent = Color(red: 0.831, green: 0.518, blue: 0.612) // #d4849c
}

struct RelativeAgo: View {
    let date: Date?
    let placeholder: String

    var body: some View {
        if let d = date {
            Text(d, style: .relative)
                .font(.caption)
                .foregroundStyle(.secondary)
        } else {
            Text(placeholder).font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct SignInPlaceholder: View {
    let title: String
    var body: some View {
        VStack(spacing: 6) {
            Text(title).font(.headline)
            Text("Open HeyBub to sign in").font(.caption).foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(WidgetTheme.bg)
    }
}
