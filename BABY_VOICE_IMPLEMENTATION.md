# Baby App — Siri Shortcuts + Lock Screen Voice Integration

## Context

This is a baby tracking app built with:
- **Frontend**: React (TypeScript)
- **Backend**: FastAPI (Python)
- **Mobile**: Capacitor for iOS
- **Current state**: Button-based tracking, AI sleep predictions, health info

We are adding **voice-first tracking** so parents can log events hands-free — including from the lock screen via Siri Shortcuts.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  iOS Native Layer                     │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Siri        │  │ Lock Screen  │  │ Live        │ │
│  │ Shortcuts / │  │ Widget       │  │ Activity    │ │
│  │ App Intents │  │ (WidgetKit)  │  │ (optional)  │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │        │
│         ▼                ▼                  ▼        │
│  ┌──────────────────────────────────────────────┐   │
│  │         Capacitor Plugin Bridge               │   │
│  │         (Swift ↔ JavaScript)                  │   │
│  └──────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              React App (Capacitor WebView)            │
│                                                       │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ Voice Hook   │  │ Baby       │  │ Event Store  │ │
│  │ (in-app mic) │  │ Dashboard  │  │ (shared)     │ │
│  └──────────────┘  └────────────┘  └──────────────┘ │
└─────────────────────────┬───────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI Backend                      │
│                                                       │
│  /api/events/log     — log baby events               │
│  /api/voice/advice   — Tier 3 LLM queries            │
│  /api/sleep/predict  — existing AI predictions        │
└─────────────────────────────────────────────────────┘
```

---

## What to Implement

### Phase 1: Siri Shortcuts (App Intents)

This is the highest priority — it gives parents hands-free logging from ANY screen, including locked.

#### 1.1 Create the iOS Native App Intent

Location: `ios/App/SiriIntents/`

Create App Intents using the iOS 16+ `AppIntents` framework. We need these intents:

**LogBabyEventIntent** — The main one. Handles all voice logging.

```swift
// ios/App/SiriIntents/LogBabyEventIntent.swift

import AppIntents
import Foundation

struct LogBabyEventIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Baby Event"
    static var description = IntentDescription("Log a feeding, diaper change, sleep event, or other baby activity")
    
    // Siri will ask "What happened?" if user doesn't provide this
    @Parameter(title: "Event Description")
    var eventDescription: String
    
    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$eventDescription)")
    }
    
    // Suggested phrases Siri will learn
    static var suggestedInvocationPhrase: String? = "Baby log"
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Parse the voice input into a structured event
        let event = BabyEventParser.parse(eventDescription)
        
        // Save to shared App Group storage (accessible by main app + widget)
        let store = BabyEventStore.shared
        try await store.save(event)
        
        // Also sync to backend if network available
        try? await APIClient.logEvent(event)
        
        // Respond with confirmation
        let confirmation = event.humanReadableSummary()
        return .result(dialog: "Logged: \(confirmation)")
    }
}
```

**QuickFeedIntent** — Shortcut specifically for feeding:

```swift
struct QuickFeedIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Feeding"
    static var description = IntentDescription("Quickly log a feeding")
    
    @Parameter(title: "Amount")
    var amount: Double?
    
    @Parameter(title: "Unit", default: .ounces)
    var unit: FeedUnit
    
    @Parameter(title: "Type", default: .bottle)
    var feedType: FeedType
    
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let event = BabyEvent(
            type: .feed,
            feedType: feedType,
            amount: amount,
            unit: unit,
            timestamp: Date()
        )
        try await BabyEventStore.shared.save(event)
        try? await APIClient.logEvent(event)
        
        if let amount = amount {
            return .result(dialog: "Logged: \(feedType.label) \(amount) \(unit.label)")
        }
        return .result(dialog: "Logged: \(feedType.label) started")
    }
}

enum FeedUnit: String, AppEnum {
    case ounces, ml
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Feed Unit")
    static var caseDisplayRepresentations: [FeedUnit: DisplayRepresentation] = [
        .ounces: "oz",
        .ml: "ml"
    ]
}

enum FeedType: String, AppEnum {
    case bottle, breast, formula
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Feed Type")
    static var caseDisplayRepresentations: [FeedType: DisplayRepresentation] = [
        .bottle: "Bottle",
        .breast: "Breast",
        .formula: "Formula"
    ]
}
```

**QuickDiaperIntent and QuickSleepIntent** — Same pattern for diaper and sleep.

#### 1.2 App Shortcuts Provider

This registers shortcuts so they appear in the Shortcuts app automatically:

```swift
// ios/App/SiriIntents/BabyAppShortcuts.swift

import AppIntents

struct BabyAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogBabyEventIntent(),
            phrases: [
                "Log baby event with \(.applicationName)",
                "Baby log with \(.applicationName)",
                "\(.applicationName) log event",
                "Track baby with \(.applicationName)"
            ],
            shortTitle: "Log Baby Event",
            systemImageName: "mic.fill"
        )
        
        AppShortcut(
            intent: QuickFeedIntent(),
            phrases: [
                "Log feeding with \(.applicationName)",
                "Baby feeding with \(.applicationName)",
                "Log bottle with \(.applicationName)"
            ],
            shortTitle: "Log Feeding",
            systemImageName: "drop.fill"
        )
        
        AppShortcut(
            intent: QuickSleepIntent(),
            phrases: [
                "Baby fell asleep with \(.applicationName)",
                "Baby woke up with \(.applicationName)",
                "Log nap with \(.applicationName)"
            ],
            shortTitle: "Log Sleep",
            systemImageName: "moon.fill"
        )
        
        AppShortcut(
            intent: QuickDiaperIntent(),
            phrases: [
                "Diaper change with \(.applicationName)",
                "Log diaper with \(.applicationName)"
            ],
            shortTitle: "Log Diaper",
            systemImageName: "arrow.triangle.2.circlepath"
        )
    }
}
```

#### 1.3 Baby Event Parser

This is the intent routing engine — parses natural language into structured events:

```swift
// ios/App/SiriIntents/BabyEventParser.swift

import Foundation

struct BabyEvent: Codable {
    let id: UUID
    let type: EventType
    let timestamp: Date
    var feedType: FeedType?
    var amount: Double?
    var unit: FeedUnit?
    var diaperType: DiaperType?
    var sleepAction: SleepAction?
    var notes: String?
    var rawTranscript: String?
    
    enum EventType: String, Codable {
        case feed, sleep, diaper, tummyTime, medicine, temperature, milestone, note
    }
    
    enum DiaperType: String, Codable {
        case wet, dirty, both, dry
    }
    
    enum SleepAction: String, Codable {
        case fellAsleep, wokeUp, napStarted, napEnded
    }
    
    func humanReadableSummary() -> String {
        switch type {
        case .feed:
            let typeStr = feedType?.label ?? "Feeding"
            if let amount = amount, let unit = unit {
                return "\(typeStr) \(amount)\(unit.label)"
            }
            return "\(typeStr) started"
        case .sleep:
            return sleepAction?.label ?? "Sleep event"
        case .diaper:
            return "Diaper: \(diaperType?.label ?? "changed")"
        case .tummyTime:
            return "Tummy time started"
        case .medicine:
            return "Medicine: \(notes ?? "logged")"
        case .temperature:
            if let amount = amount {
                return "Temperature: \(amount)°"
            }
            return "Temperature logged"
        case .milestone:
            return "Milestone: \(notes ?? "logged")"
        case .note:
            return notes ?? "Note added"
        }
    }
}

class BabyEventParser {
    
    // Keyword dictionaries
    static let feedKeywords = ["fed", "feed", "feeding", "bottle", "breast", "breastfed",
                               "nursed", "nursing", "formula", "milk", "ate", "eaten", "oz", "ounce",
                               "ounces", "ml", "milliliters"]
    
    static let sleepKeywords = ["sleep", "sleeping", "slept", "nap", "napping", "woke",
                                "wake", "waking", "asleep", "awake", "bedtime", "down",
                                "up", "resting"]
    
    static let diaperKeywords = ["diaper", "changed", "change", "poop", "pooped", "poopy",
                                 "pee", "peed", "wet", "dirty", "blowout"]
    
    static let tummyKeywords = ["tummy", "tummy time", "belly", "floor time"]
    
    static let medicineKeywords = ["medicine", "medication", "tylenol", "ibuprofen",
                                   "drops", "vitamin", "gripe"]
    
    static let temperatureKeywords = ["temperature", "temp", "fever", "degrees"]
    
    static func parse(_ input: String) -> BabyEvent {
        let lowered = input.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let words = lowered.components(separatedBy: .whitespaces)
        
        // Try to match event type by keywords
        if containsAny(words, keywords: feedKeywords) {
            return parseFeedEvent(lowered, words: words, raw: input)
        }
        
        if containsAny(words, keywords: diaperKeywords) {
            return parseDiaperEvent(lowered, words: words, raw: input)
        }
        
        if containsAny(words, keywords: sleepKeywords) {
            return parseSleepEvent(lowered, words: words, raw: input)
        }
        
        if containsAny(words, keywords: tummyKeywords) {
            return BabyEvent(id: UUID(), type: .tummyTime, timestamp: Date(), rawTranscript: input)
        }
        
        if containsAny(words, keywords: temperatureKeywords) {
            return parseTemperatureEvent(lowered, words: words, raw: input)
        }
        
        if containsAny(words, keywords: medicineKeywords) {
            return BabyEvent(id: UUID(), type: .medicine, timestamp: Date(),
                           notes: input, rawTranscript: input)
        }
        
        // Default: save as a note
        return BabyEvent(id: UUID(), type: .note, timestamp: Date(),
                        notes: input, rawTranscript: input)
    }
    
    // MARK: - Feed parsing
    
    private static func parseFeedEvent(_ input: String, words: [String], raw: String) -> BabyEvent {
        var feedType: FeedType? = nil
        var amount: Double? = nil
        var unit: FeedUnit? = nil
        
        // Detect feed type
        if input.contains("breast") || input.contains("nurs") {
            feedType = .breast
        } else if input.contains("formula") {
            feedType = .formula
        } else if input.contains("bottle") {
            feedType = .bottle
        }
        
        // Extract numeric amount
        // Handles: "4 ounces", "4oz", "120ml", "four ounces"
        let numberMap = ["one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10]
        
        for (i, word) in words.enumerated() {
            // Check for numeric value
            if let num = Double(word) {
                amount = num
            } else if let num = numberMap[word] {
                amount = Double(num)
            }
            
            // Check for unit in same word (e.g., "4oz")
            if word.hasSuffix("oz") || word.hasSuffix("ounces") || word.hasSuffix("ounce") {
                unit = .ounces
                if amount == nil, let num = Double(word.replacingOccurrences(of: "[^0-9.]",
                    with: "", options: .regularExpression)) {
                    amount = num
                }
            } else if word.hasSuffix("ml") || word.hasSuffix("milliliters") {
                unit = .ml
                if amount == nil, let num = Double(word.replacingOccurrences(of: "[^0-9.]",
                    with: "", options: .regularExpression)) {
                    amount = num
                }
            }
            
            // Check next word for unit
            if amount != nil && unit == nil && i + 1 < words.count {
                let next = words[i + 1]
                if next.hasPrefix("oz") || next.hasPrefix("ounce") {
                    unit = .ounces
                } else if next.hasPrefix("ml") || next.hasPrefix("milliliter") {
                    unit = .ml
                }
            }
        }
        
        // Default unit if amount given but no unit
        if amount != nil && unit == nil {
            unit = amount! > 20 ? .ml : .ounces // heuristic: >20 probably ml
        }
        
        return BabyEvent(id: UUID(), type: .feed, timestamp: Date(),
                        feedType: feedType, amount: amount, unit: unit, rawTranscript: raw)
    }
    
    // MARK: - Sleep parsing
    
    private static func parseSleepEvent(_ input: String, words: [String], raw: String) -> BabyEvent {
        var action: BabyEvent.SleepAction = .fellAsleep
        
        if input.contains("woke") || input.contains("wake") || input.contains("awake") || input.contains("up") {
            action = .wokeUp
        } else if input.contains("nap") && (input.contains("end") || input.contains("over") || input.contains("done")) {
            action = .napEnded
        } else if input.contains("nap") {
            action = .napStarted
        } else if input.contains("asleep") || input.contains("down") || input.contains("sleep") {
            action = .fellAsleep
        }
        
        return BabyEvent(id: UUID(), type: .sleep, timestamp: Date(),
                        sleepAction: action, rawTranscript: raw)
    }
    
    // MARK: - Diaper parsing
    
    private static func parseDiaperEvent(_ input: String, words: [String], raw: String) -> BabyEvent {
        var diaperType: BabyEvent.DiaperType = .wet
        
        let hasPoop = input.contains("poop") || input.contains("dirty") || input.contains("blowout")
        let hasPee = input.contains("pee") || input.contains("wet")
        
        if hasPoop && hasPee {
            diaperType = .both
        } else if hasPoop {
            diaperType = .dirty
        } else if hasPee {
            diaperType = .wet
        }
        
        return BabyEvent(id: UUID(), type: .diaper, timestamp: Date(),
                        diaperType: diaperType, rawTranscript: raw)
    }
    
    // MARK: - Temperature parsing
    
    private static func parseTemperatureEvent(_ input: String, words: [String], raw: String) -> BabyEvent {
        var temp: Double? = nil
        
        for word in words {
            if let num = Double(word), num > 90 && num < 110 { // Fahrenheit range
                temp = num
                break
            } else if let num = Double(word), num > 35 && num < 43 { // Celsius range
                temp = num
                break
            }
        }
        
        return BabyEvent(id: UUID(), type: .temperature, timestamp: Date(),
                        amount: temp, rawTranscript: raw)
    }
    
    // MARK: - Helpers
    
    private static func containsAny(_ words: [String], keywords: [String]) -> Bool {
        for word in words {
            for keyword in keywords {
                if word.contains(keyword) { return true }
            }
        }
        return false
    }
}
```

#### 1.4 Shared Storage (App Group)

Events must be accessible by the main app, Siri intents, AND widgets. Use App Groups:

```swift
// ios/App/Shared/BabyEventStore.swift

import Foundation

class BabyEventStore {
    static let shared = BabyEventStore()
    
    private let suiteName = "group.com.yourapp.babytracker" // CHANGE THIS
    private let eventsKey = "baby_events"
    
    private var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }
    
    func save(_ event: BabyEvent) async throws {
        var events = try await getRecentEvents()
        events.insert(event, at: 0)
        
        // Keep last 500 events locally
        if events.count > 500 {
            events = Array(events.prefix(500))
        }
        
        let data = try JSONEncoder().encode(events)
        defaults?.set(data, forKey: eventsKey)
        
        // Post notification so widget refreshes
        // WidgetCenter.shared.reloadAllTimelines() — call from widget extension
    }
    
    func getRecentEvents(limit: Int = 50) async throws -> [BabyEvent] {
        guard let data = defaults?.data(forKey: eventsKey) else { return [] }
        let events = try JSONDecoder().decode([BabyEvent].self, from: data)
        return Array(events.prefix(limit))
    }
}
```

#### 1.5 API Client for Background Sync

```swift
// ios/App/Shared/APIClient.swift

import Foundation

class APIClient {
    static let baseURL = "https://your-api.com" // CHANGE THIS
    
    static func logEvent(_ event: BabyEvent) async throws {
        let url = URL(string: "\(baseURL)/api/events/log")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Get auth token from shared keychain
        if let token = KeychainHelper.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(event)
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.syncFailed
        }
    }
    
    enum APIError: Error {
        case syncFailed
    }
}
```

---

### Phase 2: Lock Screen Widget (WidgetKit)

#### 2.1 Create Widget Extension

In Xcode: File → New → Target → Widget Extension

```swift
// ios/BabyWidget/BabyWidget.swift

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Timeline Provider

struct BabyWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BabyWidgetEntry {
        BabyWidgetEntry(date: Date(), lastEvent: nil, eventCount: 0)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (BabyWidgetEntry) -> Void) {
        Task {
            let events = try? await BabyEventStore.shared.getRecentEvents(limit: 1)
            let entry = BabyWidgetEntry(
                date: Date(),
                lastEvent: events?.first,
                eventCount: events?.count ?? 0
            )
            completion(entry)
        }
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyWidgetEntry>) -> Void) {
        Task {
            let events = try? await BabyEventStore.shared.getRecentEvents(limit: 5)
            let entry = BabyWidgetEntry(
                date: Date(),
                lastEvent: events?.first,
                eventCount: events?.count ?? 0
            )
            // Refresh every 15 minutes
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }
}

struct BabyWidgetEntry: TimelineEntry {
    let date: Date
    let lastEvent: BabyEvent?
    let eventCount: Int
}

// MARK: - Widget Views

struct BabyWidgetSmallView: View {
    var entry: BabyWidgetEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "heart.fill")
                    .foregroundColor(.pink)
                Text("Baby Log")
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            
            if let lastEvent = entry.lastEvent {
                Text(lastEvent.humanReadableSummary())
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text(lastEvent.timestamp, style: .relative)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            } else {
                Text("No events yet")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Quick action buttons using App Intents
            HStack(spacing: 12) {
                Button(intent: QuickFeedIntent()) {
                    Image(systemName: "drop.fill")
                        .font(.title3)
                }
                
                Button(intent: QuickSleepIntent()) {
                    Image(systemName: "moon.fill")
                        .font(.title3)
                }
                
                Button(intent: QuickDiaperIntent()) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.title3)
                }
            }
        }
        .padding()
    }
}

// Lock screen widget (iOS 16+)
struct BabyWidgetLockScreenView: View {
    var entry: BabyWidgetEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let lastEvent = entry.lastEvent {
                Label(lastEvent.humanReadableSummary(), systemImage: iconForEvent(lastEvent))
                    .font(.headline)
                Text(lastEvent.timestamp, style: .relative)
                    .font(.caption)
            } else {
                Label("Tap to log", systemImage: "plus.circle")
                    .font(.headline)
            }
        }
    }
    
    func iconForEvent(_ event: BabyEvent) -> String {
        switch event.type {
        case .feed: return "drop.fill"
        case .sleep: return "moon.fill"
        case .diaper: return "arrow.triangle.2.circlepath"
        case .tummyTime: return "figure.play"
        case .medicine: return "cross.case.fill"
        case .temperature: return "thermometer"
        case .milestone: return "star.fill"
        case .note: return "note.text"
        }
    }
}

// MARK: - Widget Configuration

struct BabyTrackerWidget: Widget {
    let kind: String = "BabyTrackerWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                BabyWidgetSmallView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                BabyWidgetSmallView(entry: entry)
            }
        }
        .configurationDisplayName("Baby Tracker")
        .description("Quick log baby events and see recent activity")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,      // Lock screen circular
            .accessoryRectangular,   // Lock screen rectangular
            .accessoryInline         // Lock screen inline
        ])
    }
}

// Lock screen specific widget
struct BabyTrackerLockScreenWidget: Widget {
    let kind: String = "BabyTrackerLockScreen"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyWidgetProvider()) { entry in
            BabyWidgetLockScreenView(entry: entry)
        }
        .configurationDisplayName("Baby Log Quick View")
        .description("See last baby event on lock screen")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}
```

---

### Phase 3: Capacitor Plugin Bridge

This connects the native Swift layer to your React app:

#### 3.1 Create the Capacitor Plugin

```swift
// ios/App/App/Plugins/BabyVoicePlugin.swift

import Capacitor
import AppIntents

@objc(BabyVoicePlugin)
public class BabyVoicePlugin: CAPPlugin {
    
    // Called from JS to get recent events (including those logged via Siri)
    @objc func getRecentEvents(_ call: CAPPluginCall) {
        Task {
            do {
                let events = try await BabyEventStore.shared.getRecentEvents(limit: 50)
                let encoder = JSONEncoder()
                encoder.dateEncodingStrategy = .iso8601
                let data = try encoder.encode(events)
                let jsonString = String(data: data, encoding: .utf8) ?? "[]"
                call.resolve(["events": jsonString])
            } catch {
                call.reject("Failed to get events", nil, error)
            }
        }
    }
    
    // Called from JS to log an event (also saves to shared store for widget)
    @objc func logEvent(_ call: CAPPluginCall) {
        guard let typeRaw = call.getString("type"),
              let type = BabyEvent.EventType(rawValue: typeRaw) else {
            call.reject("Missing or invalid event type")
            return
        }
        
        let event = BabyEvent(
            id: UUID(),
            type: type,
            timestamp: Date(),
            feedType: call.getString("feedType").flatMap { FeedType(rawValue: $0) },
            amount: call.getDouble("amount"),
            unit: call.getString("unit").flatMap { FeedUnit(rawValue: $0) },
            diaperType: call.getString("diaperType").flatMap { BabyEvent.DiaperType(rawValue: $0) },
            sleepAction: call.getString("sleepAction").flatMap { BabyEvent.SleepAction(rawValue: $0) },
            notes: call.getString("notes"),
            rawTranscript: call.getString("rawTranscript")
        )
        
        Task {
            do {
                try await BabyEventStore.shared.save(event)
                call.resolve(["success": true, "id": event.id.uuidString])
            } catch {
                call.reject("Failed to save event", nil, error)
            }
        }
    }
    
    // Check if Siri shortcuts are set up
    @objc func getSiriStatus(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "shortcutsConfigured": true // You can check INVoiceShortcutCenter for actual status
        ])
    }
    
    // Trigger Siri shortcut setup
    @objc func setupSiriShortcut(_ call: CAPPluginCall) {
        // iOS 16+ with App Intents — shortcuts are auto-registered
        // For iOS 15, you'd need INShortcut + INUIAddVoiceShortcutViewController
        call.resolve(["success": true])
    }
}
```

Register the plugin:

```swift
// ios/App/App/Plugins/BabyVoicePlugin.m

#import <Capacitor/Capacitor.h>

CAP_PLUGIN(BabyVoicePlugin, "BabyVoice",
    CAP_PLUGIN_METHOD(getRecentEvents, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(logEvent, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSiriStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setupSiriShortcut, CAPPluginReturnPromise);
)
```

#### 3.2 TypeScript Interface

```typescript
// src/plugins/baby-voice.ts

import { registerPlugin } from '@capacitor/core';

export interface BabyVoicePlugin {
  getRecentEvents(): Promise<{ events: string }>;
  logEvent(options: {
    type: string;
    feedType?: string;
    amount?: number;
    unit?: string;
    diaperType?: string;
    sleepAction?: string;
    notes?: string;
    rawTranscript?: string;
  }): Promise<{ success: boolean; id: string }>;
  getSiriStatus(): Promise<{ available: boolean; shortcutsConfigured: boolean }>;
  setupSiriShortcut(): Promise<{ success: boolean }>;
}

const BabyVoice = registerPlugin<BabyVoicePlugin>('BabyVoice');

export default BabyVoice;
```

#### 3.3 React Hook

```typescript
// src/hooks/useBabyVoice.ts

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import BabyVoice from '../plugins/baby-voice';

interface BabyEvent {
  id: string;
  type: string;
  timestamp: string;
  feedType?: string;
  amount?: number;
  unit?: string;
  diaperType?: string;
  sleepAction?: string;
  notes?: string;
  rawTranscript?: string;
}

export function useBabyVoice() {
  const [events, setEvents] = useState<BabyEvent[]>([]);
  const [siriAvailable, setSiriAvailable] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isNative) {
      // Check Siri status
      BabyVoice.getSiriStatus().then(status => {
        setSiriAvailable(status.available);
      });

      // Load events (includes those logged via Siri)
      refreshEvents();
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    if (!isNative) return;
    
    try {
      const result = await BabyVoice.getRecentEvents();
      const parsed = JSON.parse(result.events) as BabyEvent[];
      setEvents(parsed);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [isNative]);

  const logEvent = useCallback(async (eventData: Partial<BabyEvent>) => {
    if (!eventData.type) throw new Error('Event type required');

    if (isNative) {
      const result = await BabyVoice.logEvent(eventData as any);
      await Haptics.impact({ style: ImpactStyle.Light });
      await refreshEvents();
      return result;
    } else {
      // Web fallback — call API directly
      const response = await fetch('/api/events/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      return response.json();
    }
  }, [isNative, refreshEvents]);

  return {
    events,
    logEvent,
    refreshEvents,
    siriAvailable,
    isNative,
  };
}
```

---

### Phase 4: In-App Voice (getUserMedia + STT)

For when the user is already in the app and wants to speak:

```typescript
// src/hooks/useInAppVoice.ts

import { useState, useRef, useCallback } from 'react';

interface VoiceResult {
  transcript: string;
  event?: any;
  needsLLM: boolean;
}

export function useInAppVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Send to your FastAPI backend for transcription
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        try {
          const response = await fetch('/api/voice/transcribe', {
            method: 'POST',
            body: formData,
          });
          const result: VoiceResult = await response.json();
          setTranscript(result.transcript);
          
          // Return result for the component to handle
          return result;
        } catch (err) {
          console.error('Transcription failed:', err);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error('Mic access denied:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  };
}
```

---

### Phase 5: FastAPI Backend Endpoints

```python
# app/routers/voice.py

from fastapi import APIRouter, UploadFile, File, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import tempfile
import os

router = APIRouter(prefix="/api")

# --- Models ---

class BabyEventCreate(BaseModel):
    type: str
    feed_type: Optional[str] = None
    amount: Optional[float] = None
    unit: Optional[str] = None
    diaper_type: Optional[str] = None
    sleep_action: Optional[str] = None
    notes: Optional[str] = None
    raw_transcript: Optional[str] = None
    timestamp: Optional[datetime] = None

class VoiceResult(BaseModel):
    transcript: str
    event: Optional[dict] = None
    needs_llm: bool = False
    advice: Optional[str] = None

# --- Event Logging ---

@router.post("/events/log")
async def log_event(event: BabyEventCreate, user=Depends(get_current_user)):
    """Log a baby event from the app, Siri, or voice."""
    if not event.timestamp:
        event.timestamp = datetime.utcnow()
    
    # Save to database
    db_event = await save_event(user.baby_id, event)
    
    return {"success": True, "id": str(db_event.id)}

# --- Voice Transcription ---

@router.post("/voice/transcribe")
async def transcribe_voice(
    audio: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """Transcribe audio and parse baby event."""
    
    # Save uploaded audio to temp file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Option A: Use faster-whisper (self-hosted)
        transcript = await transcribe_with_faster_whisper(tmp_path)
        
        # Option B: Use OpenAI Whisper API (cloud)
        # transcript = await transcribe_with_whisper_api(tmp_path)
        
        # Parse the transcript into a baby event
        parsed = parse_baby_event(transcript)
        
        if parsed["needs_llm"]:
            # Tier 3 — get LLM advice
            advice = await get_llm_advice(transcript, user.baby_id)
            return VoiceResult(
                transcript=transcript,
                needs_llm=True,
                advice=advice
            )
        
        # Tier 1 or 2 — log the event
        if parsed.get("event"):
            event = BabyEventCreate(**parsed["event"], raw_transcript=transcript)
            await save_event(user.baby_id, event)
        
        return VoiceResult(
            transcript=transcript,
            event=parsed.get("event"),
            needs_llm=False
        )
    finally:
        os.unlink(tmp_path)

# --- Transcription Backends ---

async def transcribe_with_faster_whisper(audio_path: str) -> str:
    """Use faster-whisper for local transcription."""
    from faster_whisper import WhisperModel
    
    # Load model (cache this in production)
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    
    segments, _ = model.transcribe(audio_path, language="en")
    transcript = " ".join([segment.text for segment in segments])
    return transcript.strip()

# --- Baby Event Parser (Python version mirrors Swift parser) ---

FEED_KEYWORDS = {"fed", "feed", "feeding", "bottle", "breast", "breastfed",
                 "nursed", "nursing", "formula", "milk", "ate", "oz", "ounce", "ounces", "ml"}
SLEEP_KEYWORDS = {"sleep", "sleeping", "slept", "nap", "napping", "woke",
                  "wake", "asleep", "awake", "bedtime", "down"}
DIAPER_KEYWORDS = {"diaper", "changed", "change", "poop", "pooped",
                   "pee", "peed", "wet", "dirty", "blowout"}

def parse_baby_event(transcript: str) -> dict:
    """Parse transcript into structured baby event."""
    words = set(transcript.lower().split())
    
    # Check for open-ended / emotional content → Tier 3
    tier3_signals = {"advice", "help", "should", "normal", "worried", "concerned",
                     "why", "what do", "burned out", "exhausted", "struggling"}
    if words & tier3_signals:
        return {"needs_llm": True, "event": None}
    
    # Tier 1/2: Parse structured events
    if words & FEED_KEYWORDS:
        return {"needs_llm": False, "event": parse_feed(transcript)}
    
    if words & DIAPER_KEYWORDS:
        return {"needs_llm": False, "event": parse_diaper(transcript)}
    
    if words & SLEEP_KEYWORDS:
        return {"needs_llm": False, "event": parse_sleep(transcript)}
    
    # Default: save as note, not LLM
    return {"needs_llm": False, "event": {"type": "note", "notes": transcript}}

def parse_feed(transcript: str) -> dict:
    """Extract feed event details."""
    import re
    
    event = {"type": "feed"}
    lower = transcript.lower()
    
    # Feed type
    if "breast" in lower or "nurs" in lower:
        event["feed_type"] = "breast"
    elif "formula" in lower:
        event["feed_type"] = "formula"
    elif "bottle" in lower:
        event["feed_type"] = "bottle"
    
    # Amount
    match = re.search(r'(\d+\.?\d*)\s*(oz|ounce|ounces|ml|milliliter)', lower)
    if match:
        event["amount"] = float(match.group(1))
        event["unit"] = "ounces" if "oz" in match.group(2) or "ounce" in match.group(2) else "ml"
    
    return event

def parse_diaper(transcript: str) -> dict:
    lower = transcript.lower()
    has_poop = any(w in lower for w in ["poop", "dirty", "blowout"])
    has_pee = any(w in lower for w in ["pee", "wet"])
    
    diaper_type = "both" if has_poop and has_pee else "dirty" if has_poop else "wet"
    return {"type": "diaper", "diaper_type": diaper_type}

def parse_sleep(transcript: str) -> dict:
    lower = transcript.lower()
    if any(w in lower for w in ["woke", "wake", "awake", "up"]):
        action = "wokeUp"
    elif "nap" in lower:
        action = "napStarted"
    else:
        action = "fellAsleep"
    return {"type": "sleep", "sleep_action": action}

# --- LLM Advice (Tier 3) ---

async def get_llm_advice(transcript: str, baby_id: str) -> str:
    """Get personalized advice from Claude."""
    import anthropic
    
    # Get recent baby data for context
    recent_events = await get_recent_events(baby_id, hours=48)
    
    client = anthropic.AsyncAnthropic()
    response = await client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=500,
        system="""You are a warm, supportive baby care assistant. Give brief, practical advice. 
        Be reassuring but honest. If something sounds concerning, gently suggest consulting 
        their pediatrician. Keep responses under 3 paragraphs.""",
        messages=[{
            "role": "user",
            "content": f"""Here's what's been happening with the baby in the last 48 hours:
            {format_events_for_context(recent_events)}
            
            The parent says: "{transcript}"
            
            Give helpful, warm advice."""
        }]
    )
    return response.content[0].text
```

---

## Xcode Setup Requirements

### CRITICAL: Do these steps manually in Xcode before running:

1. **Enable App Groups capability**
   - Main app target → Signing & Capabilities → + App Groups
   - Add: `group.com.yourapp.babytracker`
   - Do the same for the Widget extension and Siri Intent extension

2. **Add Siri capability**
   - Main app target → Signing & Capabilities → + Siri

3. **Create Widget Extension**
   - File → New → Target → Widget Extension
   - Name: `BabyWidget`
   - Check "Include Lock Screen Widget"

4. **Create Intents Extension** (for iOS 15 compatibility, optional if targeting iOS 16+ only)
   - File → New → Target → Intents Extension
   - Name: `BabyIntents`

5. **Info.plist additions** for the main app:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Record voice to quickly log baby events hands-free</string>
   <key>NSSiriUsageDescription</key>
   <string>Use Siri to log baby events hands-free</string>
   ```

6. **Shared code**: The `BabyEvent`, `BabyEventStore`, `BabyEventParser`, and `APIClient` files must be added to ALL targets (main app, widget, intents) so they can access the shared models and storage.

---

## File Structure

```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift          (existing, add App Intents registration)
│   │   ├── Plugins/
│   │   │   ├── BabyVoicePlugin.swift  (Capacitor bridge)
│   │   │   └── BabyVoicePlugin.m      (ObjC bridge)
│   │   └── ...
│   ├── Shared/                         (shared across all targets)
│   │   ├── BabyEvent.swift            (data model)
│   │   ├── BabyEventStore.swift       (App Group storage)
│   │   ├── BabyEventParser.swift      (intent parser)
│   │   ├── APIClient.swift            (backend sync)
│   │   └── KeychainHelper.swift       (auth token storage)
│   └── SiriIntents/
│       ├── LogBabyEventIntent.swift
│       ├── QuickFeedIntent.swift
│       ├── QuickSleepIntent.swift
│       ├── QuickDiaperIntent.swift
│       └── BabyAppShortcuts.swift
├── BabyWidget/
│   ├── BabyWidget.swift
│   └── Assets.xcassets/
src/
├── hooks/
│   ├── useBabyVoice.ts               (Capacitor bridge hook)
│   └── useInAppVoice.ts              (in-app mic recording)
├── plugins/
│   └── baby-voice.ts                 (plugin type definitions)
app/
├── routers/
│   └── voice.py                      (FastAPI endpoints)
```

---

## Implementation Order

1. **Start with the data model** — `BabyEvent.swift` and `BabyEventStore.swift`
2. **Build the parser** — `BabyEventParser.swift` (test with unit tests)
3. **Add App Intents** — `LogBabyEventIntent.swift` + `BabyAppShortcuts.swift`
4. **Test Siri** — "Hey Siri, baby log" should work at this point
5. **Add the Widget** — `BabyWidget.swift`
6. **Build the Capacitor bridge** — Plugin + TypeScript types
7. **Add React hooks** — `useBabyVoice.ts`
8. **Add FastAPI endpoints** — `voice.py`
9. **Add in-app voice** — `useInAppVoice.ts`

---

## Testing Checklist

- [ ] "Hey Siri, baby log" → "bottle 4 ounces" → confirms "Logged: Bottle 4oz"
- [ ] "Hey Siri, log feeding with [App Name]" → works
- [ ] "Hey Siri, diaper change with [App Name]" → works
- [ ] Lock screen widget shows last event
- [ ] Widget quick action buttons log events
- [ ] Events logged via Siri appear in the main app
- [ ] Events logged in the app appear in the widget
- [ ] In-app voice recording transcribes and logs correctly
- [ ] Tier 3 queries ("is this normal?") route to LLM and return advice
- [ ] Works offline (events queue and sync when network returns)
- [ ] Haptic feedback on successful log
