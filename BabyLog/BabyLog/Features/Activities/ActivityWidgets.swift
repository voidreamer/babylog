import SwiftUI

// MARK: - Shared Helpers

/// Parses an ISO 8601 time string and returns a human-readable "time ago" label.
private func timeAgo(from isoString: String?) -> String {
    guard let isoString else { return "--" }

    let isoFractional = ISO8601DateFormatter()
    isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime]

    guard let date = isoFractional.date(from: isoString) ?? iso.date(from: isoString) else {
        return "--"
    }

    let seconds = Int(Date.now.timeIntervalSince(date))

    if seconds < 60 { return "just now" }
    let minutes = seconds / 60
    if minutes < 60 { return "\(minutes)m ago" }
    let hours = minutes / 60
    if hours < 24 { return "\(hours)h ago" }
    let days = hours / 24
    return "\(days)d ago"
}

/// Formats minutes into a readable duration string like "1h 23m" or "45m".
private func formatDuration(_ minutes: Double?) -> String {
    guard let minutes, minutes > 0 else { return "--" }
    let totalMinutes = Int(minutes)
    if totalMinutes >= 60 {
        let h = totalMinutes / 60
        let m = totalMinutes % 60
        return m > 0 ? "\(h)h \(m)m" : "\(h)h"
    }
    return "\(totalMinutes)m"
}

// MARK: - FeedingWidget

struct FeedingWidget: View {
    let feeding: Feeding?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    private var typeIcon: String {
        guard let feeding else { return "fork.knife" }
        switch feeding.type {
        case .breast: return "figure.and.child.holdinghands"
        case .bottle: return "waterbottle"
        case .formula: return "flask"
        case .breastmilkBottle: return "waterbottle.fill"
        case .solid: return "fork.knife"
        }
    }

    private var typeLabel: String {
        guard let feeding else { return "Feeding" }
        switch feeding.type {
        case .breast: return "Breast"
        case .bottle: return "Bottle"
        case .formula: return "Formula"
        case .breastmilkBottle: return "BM Bottle"
        case .solid: return "Solid"
        }
    }

    private var detail: String {
        guard let feeding else { return "--" }
        if let ml = feeding.amountMl, ml > 0 {
            return "\(Int(ml)) ml"
        }
        if let dur = feeding.durationMinutes, dur > 0 {
            return formatDuration(dur)
        }
        return "--"
    }

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Feeding", icon: typeIcon, accentColor: theme.feeding.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(typeLabel)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(theme.text)
                        Text(detail)
                            .font(.system(size: 13))
                            .foregroundStyle(theme.textSecondary)
                    }
                    Spacer()
                    Text(timeAgo(from: feeding?.time))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - DiaperWidget

struct DiaperWidget: View {
    let diaper: Diaper?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    private var typeLabel: String {
        guard let diaper else { return "Diaper" }
        switch diaper.type {
        case .pee: return "Pee"
        case .poo: return "Poo"
        case .mixed: return "Mixed"
        }
    }

    private var pooDetail: String? {
        guard let diaper, (diaper.type == .poo || diaper.type == .mixed) else { return nil }
        var parts: [String] = []
        if let color = diaper.pooColor { parts.append(color.capitalized) }
        if let consistency = diaper.pooConsistency { parts.append(consistency) }
        if let amount = diaper.pooAmount { parts.append(amount) }
        return parts.isEmpty ? nil : parts.joined(separator: " / ")
    }

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Diaper", icon: "drop.fill", accentColor: theme.diaper.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(typeLabel)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(theme.text)
                        if let pooDetail {
                            Text(pooDetail)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.textSecondary)
                        }
                    }
                    Spacer()
                    Text(timeAgo(from: diaper?.time))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - SleepWidget

struct SleepWidget: View {
    let sleep: SleepRecord?
    let currentSleep: SleepRecord?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    @State private var elapsedSeconds: Int = 0
    @State private var timerTask: Task<Void, Never>?

    private var isSleeping: Bool {
        currentSleep != nil
    }

    private var sleepingElapsed: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Sleep", icon: "moon.zzz.fill", accentColor: theme.sleep.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        if isSleeping {
                            Text("Sleeping...")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(theme.sleep.main)
                            Text(sleepingElapsed)
                                .font(.system(size: 13, design: .monospaced))
                                .foregroundStyle(theme.textSecondary)
                                .contentTransition(.numericText())
                        } else if let sleep {
                            Text(formatDuration(sleep.durationMinutes))
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(theme.text)
                        } else {
                            Text("--")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                    Spacer()
                    if isSleeping {
                        Image(systemName: "circle.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(theme.sleep.main)
                            .symbolEffect(.pulse)
                    } else {
                        Text(timeAgo(from: sleep?.startTime))
                            .font(.system(size: 12))
                            .foregroundStyle(theme.textMuted)
                    }
                }
            }
        }
        .buttonStyle(.plain)
        .onAppear { startTimerIfNeeded() }
        .onDisappear { timerTask?.cancel() }
        .onChange(of: currentSleep?.id) { _, _ in
            timerTask?.cancel()
            startTimerIfNeeded()
        }
    }

    private func startTimerIfNeeded() {
        guard let currentSleep else {
            elapsedSeconds = 0
            return
        }
        updateElapsed(from: currentSleep.startTime)
        timerTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { break }
                await MainActor.run { updateElapsed(from: currentSleep.startTime) }
            }
        }
    }

    private func updateElapsed(from isoString: String) {
        let isoFormatter = ISO8601DateFormatter()
        guard let start = isoFormatter.date(from: isoString) else { return }
        elapsedSeconds = max(0, Int(Date.now.timeIntervalSince(start)))
    }
}

// MARK: - PumpingWidget

struct PumpingWidget: View {
    let pumping: Pumping?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    private var detail: String {
        guard let pumping else { return "--" }
        var parts: [String] = []
        if let ml = pumping.amountMl, ml > 0 { parts.append("\(Int(ml)) ml") }
        if let dur = pumping.durationMinutes, dur > 0 { parts.append(formatDuration(dur)) }
        return parts.isEmpty ? "--" : parts.joined(separator: " / ")
    }

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Pumping", icon: "drop.degreesign", accentColor: theme.pumping.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(detail)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(theme.text)
                    }
                    Spacer()
                    Text(timeAgo(from: pumping?.time))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - PottyWidget

struct PottyWidget: View {
    let potty: PottyLog?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    private var resultLabel: String {
        guard let potty else { return "--" }
        switch potty.result {
        case .success: return "Success"
        case .attempt: return "Attempt"
        case .accident: return "Accident"
        }
    }

    private var resultIcon: String {
        guard let potty else { return "toilet" }
        switch potty.result {
        case .success: return "checkmark.circle.fill"
        case .attempt: return "arrow.clockwise.circle"
        case .accident: return "exclamationmark.triangle.fill"
        }
    }

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Potty", icon: "toilet", accentColor: theme.potty.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Image(systemName: resultIcon)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.potty.main)
                            Text(resultLabel)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(theme.text)
                        }
                    }
                    Spacer()
                    Text(timeAgo(from: potty?.time))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - TummyTimeWidget

struct TummyTimeWidget: View {
    let tummyTime: TummyTime?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Tummy Time", icon: "figure.play", accentColor: theme.tummy.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(formatDuration(tummyTime?.durationMinutes))
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(theme.text)
                    }
                    Spacer()
                    Text(timeAgo(from: tummyTime?.startTime))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - BathWidget

struct BathWidget: View {
    let bath: Bath?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Bath", icon: "bathtub.fill", accentColor: theme.bath.main) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(bath != nil ? "Last bath" : "--")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(theme.text)
                    }
                    Spacer()
                    Text(timeAgo(from: bath?.time))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - SupplementWidget

struct SupplementWidget: View {
    let supplement: Supplement?
    let onTap: () -> Void

    @Environment(\.appTheme) private var theme

    var body: some View {
        Button(action: onTap) {
            WidgetCard(title: "Supplement", icon: "pill.fill", accentColor: theme.supplementAction) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(supplement?.name ?? "--")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundStyle(theme.text)
                        if let dosage = supplement?.dosage, !dosage.isEmpty {
                            Text(dosage)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.textSecondary)
                        }
                    }
                    Spacer()
                    Text(timeAgo(from: supplement?.time))
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .buttonStyle(.plain)
    }
}
