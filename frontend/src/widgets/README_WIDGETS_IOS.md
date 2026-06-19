# HeyBub iOS Widget (WidgetKit)

This document describes how to build an iOS home-screen / lock-screen widget that
displays baby tracking data from the HeyBub app.

## Architecture

```
  React App (Capacitor)
       |
       | updateWidgetData()  ->  Capacitor Preferences
       |                          (UserDefaults, App Group)
       v
  WidgetKit Extension
       |
       | reads UserDefaults(suiteName: "group.com.heybub.app")
       | key: "heybub_widget_data"
       v
  Widget UI (SwiftUI)
```

The frontend writes a JSON blob to shared storage after every dashboard fetch.
The widget extension reads that JSON and renders it.

## Prerequisites

1. **Xcode 15+** with an iOS 17+ deployment target.
2. The Capacitor iOS project (`npx cap open ios`).

## Setup Steps

### 1. Enable App Groups

In Xcode, select the **main app target** -> Signing & Capabilities:

1. Click **+ Capability** -> **App Groups**.
2. Add the group: `group.com.heybub.app`.

### 2. Create Widget Extension Target

1. File -> New -> Target -> **Widget Extension**.
2. Product Name: `HeyBubWidget`.
3. Check "Include Configuration App Intent" if you want configurable widgets.
4. When prompted, activate the scheme.

### 3. Add App Group to Widget Extension

Select the **HeyBubWidget** target -> Signing & Capabilities -> App Groups ->
add `group.com.heybub.app` (same group as the main app).

### 4. Configure Capacitor Preferences for App Group

In `capacitor.config.json`, ensure the Preferences plugin writes to the shared
suite (requires `@capacitor/preferences` v6+):

```json
{
  "plugins": {
    "Preferences": {
      "iosGroup": "group.com.heybub.app"
    }
  }
}
```

If the Capacitor Preferences plugin does not support App Group suites directly,
you can add a thin native bridge in `ios/App/App/WidgetBridge.swift` that
copies values from the standard UserDefaults into the shared suite.

## Data Contract

The frontend writes JSON to the key `heybub_widget_data` in UserDefaults.
The Swift structs below match the TypeScript `WidgetData` interface defined in
`src/utils/widgetBridge.ts`.

### Swift Models

```swift
import Foundation

struct HeyBubWidgetData: Codable {
    let baby_name: String
    let baby_id: Int
    let last_updated: String
    let last_feeding: LastFeeding?
    let last_diaper: LastDiaper?
    let last_sleep: LastSleep?
    let today_summary: TodaySummary
}

struct LastFeeding: Codable {
    let time: String
    let type: String          // formula, breast, bottle, solid
    let amount: String?       // "4oz", "120ml", "15min"
    let minutes_ago: Int
}

struct LastDiaper: Codable {
    let time: String
    let type: String          // pee, poo, mixed
    let minutes_ago: Int
}

struct LastSleep: Codable {
    let start_time: String
    let end_time: String?     // nil = currently sleeping
    let duration_minutes: Int?
    let is_active: Bool
}

struct TodaySummary: Codable {
    let feedings: Int
    let diapers: Int
    let sleep_hours: Double
    let last_update: String
}
```

### Reading Data from the Shared Suite

```swift
func loadWidgetData() -> HeyBubWidgetData? {
    let userDefaults = UserDefaults(suiteName: "group.com.heybub.app")
    guard let json = userDefaults?.string(forKey: "heybub_widget_data"),
          let data = json.data(using: .utf8)
    else { return nil }
    return try? JSONDecoder().decode(HeyBubWidgetData.self, from: data)
}
```

## Sample TimelineProvider

```swift
import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
    let date: Date
    let data: HeyBubWidgetData?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), data: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
        let entry = SimpleEntry(date: Date(), data: loadWidgetData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
        let data = loadWidgetData()
        let entry = SimpleEntry(date: Date(), data: data)

        // Refresh every 15 minutes
        let nextUpdate = Date().addingTimeInterval(15 * 60)
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadWidgetData() -> HeyBubWidgetData? {
        let userDefaults = UserDefaults(suiteName: "group.com.heybub.app")
        guard let json = userDefaults?.string(forKey: "heybub_widget_data"),
              let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(HeyBubWidgetData.self, from: data)
    }
}
```

## Sample Widget View

```swift
struct HeyBubWidgetEntryView: View {
    var entry: Provider.Entry

    @Environment(\.widgetFamily) var family

    var body: some View {
        if let data = entry.data {
            switch family {
            case .systemSmall:
                SmallWidgetView(data: data)
            case .systemMedium:
                MediumWidgetView(data: data)
            case .accessoryRectangular:
                LockScreenWidgetView(data: data)
            default:
                SmallWidgetView(data: data)
            }
        } else {
            Text("Open HeyBub to load data")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct SmallWidgetView: View {
    let data: HeyBubWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(data.baby_name)
                .font(.headline)
                .lineLimit(1)

            if let feeding = data.last_feeding {
                Label("\(feeding.minutes_ago)m ago", systemImage: "fork.knife")
                    .font(.caption)
            }

            if let diaper = data.last_diaper {
                Label("\(diaper.minutes_ago)m ago", systemImage: "humidity")
                    .font(.caption)
            }

            if let sleep = data.last_sleep, sleep.is_active {
                Label("Sleeping", systemImage: "moon.zzz.fill")
                    .font(.caption)
                    .foregroundColor(.purple)
            }
        }
        .padding()
    }
}

struct MediumWidgetView: View {
    let data: HeyBubWidgetData

    var body: some View {
        HStack {
            SmallWidgetView(data: data)
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text("Today")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Label("\(data.today_summary.feedings)", systemImage: "fork.knife")
                    .font(.caption)
                Label("\(data.today_summary.diapers)", systemImage: "humidity")
                    .font(.caption)
                Label(String(format: "%.1fh", data.today_summary.sleep_hours),
                      systemImage: "moon.zzz")
                    .font(.caption)
            }
        }
        .padding()
    }
}

struct LockScreenWidgetView: View {
    let data: HeyBubWidgetData

    var body: some View {
        VStack(alignment: .leading) {
            Text(data.baby_name).font(.headline)
            if let feeding = data.last_feeding {
                Text("Fed \(feeding.minutes_ago)m ago").font(.caption2)
            }
        }
    }
}
```

## Widget Configuration

Register the widget in your `@main` widget bundle:

```swift
@main
struct HeyBubWidgetBundle: WidgetBundle {
    var body: some Widget {
        HeyBubWidget()
    }
}

struct HeyBubWidget: Widget {
    let kind: String = "HeyBubWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            HeyBubWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("HeyBub")
        .description("Track feedings, diapers, and sleep at a glance.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryRectangular,
        ])
    }
}
```

## Forcing a Widget Refresh from the App

When the frontend calls `reloadWidgetTimelines()`, the native bridge should
invoke:

```swift
import WidgetKit

WidgetCenter.shared.reloadAllTimelines()
```

This can be implemented as a Capacitor plugin or called from
`AppDelegate`/`SceneDelegate` on `applicationDidBecomeActive`.

## Troubleshooting

- **Widget shows stale data**: Verify both targets share the same App Group.
- **JSON parse error**: Compare the Swift structs against the TypeScript
  `WidgetData` interface in `src/utils/widgetBridge.ts`.
- **Widget not appearing**: Ensure the widget extension's minimum deployment
  target matches or is lower than the device OS version.
