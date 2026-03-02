import SwiftUI

// MARK: - RestPlannerView

struct RestPlannerView: View {

    let babyId: Int
    let isPremium: Bool
    let restPlanData: RestPlanResponse?
    let isLoading: Bool

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Rest Planner")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)

                Spacer()

                if !isPremium {
                    premiumBadge(theme: theme)
                }
            }

            if isLoading {
                loadingState(theme: theme)
            } else if let data = restPlanData,
                      data.patternsUsed?.hasEnoughData == true,
                      !data.restWindows.isEmpty {
                restPlanContent(data: data, theme: theme)
                    .blur(radius: isPremium ? 0 : 6)
                    .overlay {
                        if !isPremium {
                            upgradeOverlay(theme: theme)
                        }
                    }
            } else {
                emptyState(theme: theme)
            }
        }
        .cardStyle()
    }

    // MARK: - Loading

    private func loadingState(theme: ResolvedTheme) -> some View {
        HStack {
            Spacer()
            ProgressView()
                .controlSize(.regular)
            Text("Generating rest plan...")
                .font(.appBody(size: 14))
                .foregroundStyle(theme.textSecondary)
            Spacer()
        }
        .padding(.vertical, Spacing.xl)
    }

    // MARK: - Empty State

    private func emptyState(theme: ResolvedTheme) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 32))
                .foregroundStyle(theme.textMuted)
            Text("No rest plan available")
                .font(.appBody(size: 14))
                .foregroundStyle(theme.textSecondary)
            Text("Keep logging sleep and activities to generate personalized schedule suggestions.")
                .font(.appBody(size: 13))
                .foregroundStyle(theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
    }

    // MARK: - Rest Plan Content

    private func restPlanContent(data: RestPlanResponse, theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Summary message
            if let summary = data.summary {
                RestSummaryCard(summary: summary, theme: theme)
            }

            // Timeline bar
            RestTimelineBar(windows: data.restWindows, theme: theme)

            // Carousel
            RestWindowCarousel(windows: data.restWindows, theme: theme)

            // Meta footer
            if let patterns = data.patternsUsed {
                HStack {
                    Text("Based on \(patterns.dataDays) days of data")
                        .font(.appBody(size: 12))
                        .foregroundStyle(theme.textMuted)
                    Spacer()
                    HStack(spacing: 3) {
                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 10))
                        Text("AI-powered")
                            .font(.appBody(size: 11, weight: .medium))
                    }
                    .foregroundStyle(theme.accent.opacity(0.7))
                }
            }
        }
    }

    // MARK: - Premium Badge

    private func premiumBadge(theme: ResolvedTheme) -> some View {
        HStack(spacing: 4) {
            Image(systemName: "star.fill")
                .font(.system(size: 10))
            Text("Premium")
                .font(.appBody(size: 11, weight: .semibold))
        }
        .foregroundStyle(Color.orange)
        .padding(.horizontal, 8)
        .padding(.vertical, 3)
        .background(Color.orange.opacity(0.12))
        .clipShape(Capsule())
    }

    // MARK: - Upgrade Overlay

    private func upgradeOverlay(theme: ResolvedTheme) -> some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "lock.fill")
                .font(.system(size: 20))
                .foregroundStyle(theme.textSecondary)
            Text("Upgrade to see your rest plan")
                .font(.appBody(size: 14, weight: .medium))
                .foregroundStyle(theme.text)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: Radii.sm, style: .continuous))
    }
}

// MARK: - Summary Card

private struct RestSummaryCard: View {
    let summary: RestSummary
    let theme: ResolvedTheme

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Icon
            Image(systemName: summaryIcon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(summaryColor)

            VStack(alignment: .leading, spacing: 2) {
                Text(summaryMessage)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)

                if summary.totalRestMinutesRemaining > 0 {
                    Text("\(summary.totalRestMinutesRemaining) min remaining \u{00b7} \(summary.restWindowsCount) window\(summary.restWindowsCount == 1 ? "" : "s")")
                        .font(.appBody(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(summaryColor.opacity(0.08))
        )
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(summaryColor)
                .frame(width: 3)
        }
    }

    private var summaryIcon: String {
        switch summary.messageKey {
        case "rest_now":    return "moon.fill"
        case "rest_soon":   return "cup.and.saucer.fill"
        case "rest_later":  return "cup.and.saucer.fill"
        default:            return "exclamationmark.circle"
        }
    }

    private var summaryMessage: String {
        switch summary.messageKey {
        case "rest_now":
            return "Time to rest now"
        case "rest_soon":
            if let mins = summary.nextRestInMinutes {
                return "Rest time in ~\(mins) min"
            }
            return "Rest time coming soon"
        case "rest_later":
            if let mins = summary.nextRestInMinutes {
                return "Next rest in ~\(mins) min"
            }
            return "Rest time later today"
        default:
            return "No rest predicted"
        }
    }

    private var summaryColor: Color {
        switch summary.messageKey {
        case "rest_now":    return theme.success
        case "rest_soon":   return theme.sleep.main
        case "rest_later":  return Color.orange
        default:            return theme.textMuted
        }
    }
}

// MARK: - Timeline Bar

private struct RestTimelineBar: View {
    let windows: [RestWindow]
    let theme: ResolvedTheme

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoFormatterNoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private func parseDate(_ str: String) -> Date? {
        Self.isoFormatter.date(from: str) ?? Self.isoFormatterNoFrac.date(from: str)
    }

    var body: some View {
        let now = Date()
        let dates: [(Date, Date)] = windows.compactMap { w in
            guard let s = parseDate(w.start), let e = parseDate(w.end) else { return nil }
            return (s, e)
        }
        guard !dates.isEmpty else { return AnyView(EmptyView()) }

        let rangeStart = min(now, dates.first!.0)
        let rangeEnd = dates.last!.1
        let totalMs = rangeEnd.timeIntervalSince(rangeStart)
        guard totalMs > 0 else { return AnyView(EmptyView()) }

        let pct = { (d: Date) -> CGFloat in
            CGFloat(max(0, min(1, d.timeIntervalSince(rangeStart) / totalMs)))
        }

        return AnyView(
            VStack(spacing: Spacing.xs) {
                GeometryReader { geo in
                    let w = geo.size.width
                    ZStack(alignment: .leading) {
                        // Track
                        RoundedRectangle(cornerRadius: 3)
                            .fill(theme.border)
                            .frame(height: 6)

                        // Windows
                        ForEach(Array(dates.enumerated()), id: \.offset) { i, pair in
                            let left = pct(pair.0) * w
                            let blockWidth = max(4, (pct(pair.1) - pct(pair.0)) * w)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(qualityColor(windows[i].quality))
                                .frame(width: blockWidth, height: 6)
                                .offset(x: left)
                        }

                        // Now indicator
                        Circle()
                            .fill(theme.accent)
                            .frame(width: 8, height: 8)
                            .offset(x: pct(now) * w - 4)
                    }
                }
                .frame(height: 8)

                // Labels
                HStack {
                    Text(Self.timeFormatter.string(from: rangeStart))
                        .font(.appBody(size: 10))
                        .foregroundStyle(theme.textMuted)
                    Spacer()
                    Text(Self.timeFormatter.string(from: rangeEnd))
                        .font(.appBody(size: 10))
                        .foregroundStyle(theme.textMuted)
                }
            }
        )
    }

    private func qualityColor(_ quality: String) -> Color {
        switch quality {
        case "great": return theme.success
        case "good":  return theme.sleep.main
        default:      return theme.tummy.main
        }
    }
}

// MARK: - Window Carousel

private struct RestWindowCarousel: View {
    let windows: [RestWindow]
    let theme: ResolvedTheme

    @State private var currentIndex = 0

    var body: some View {
        VStack(spacing: Spacing.sm) {
            // Card with swipe
            TabView(selection: $currentIndex) {
                ForEach(Array(windows.enumerated()), id: \.element.id) { i, window in
                    RestWindowCard(window: window, theme: theme)
                        .tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 180)
            .animation(.appSnappy, value: currentIndex)

            // Dot indicators
            if windows.count > 1 {
                HStack(spacing: 6) {
                    ForEach(0..<windows.count, id: \.self) { i in
                        Circle()
                            .fill(i == currentIndex ? theme.accent : theme.border)
                            .frame(width: 6, height: 6)
                            .onTapGesture { currentIndex = i }
                    }
                }
            }
        }
    }
}

// MARK: - Window Card

private struct RestWindowCard: View {
    let window: RestWindow
    let theme: ResolvedTheme

    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let isoFormatterNoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    private func parseDate(_ str: String) -> Date? {
        Self.isoFormatter.date(from: str) ?? Self.isoFormatterNoFrac.date(from: str)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Time display
            HStack {
                Image(systemName: "clock")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textSecondary)
                Text(timeDisplay)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)
                Spacer()
                Text("\(window.durationMinutes) min")
                    .font(.appBody(size: 13, weight: .medium))
                    .foregroundStyle(theme.textSecondary)
            }

            // Badges row
            HStack(spacing: Spacing.sm) {
                // Confidence badge
                confidenceBadge

                // Quality badge
                qualityBadge

                // Current nap badge
                if window.isCurrent {
                    Text("Current")
                        .font(.appBody(size: 11, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(theme.accent)
                        .clipShape(Capsule())
                }
            }

            // Sleep pressure bar (not for current nap)
            if let pressure = window.sleepPressureAtStart, !window.isCurrent {
                sleepPressureIndicator(pressure: pressure)
            }

            // Signal pills
            if let signals = window.signals, !signals.isEmpty {
                signalPills(signals: signals)
            }

            // Notes
            if let notes = window.notes, !notes.isEmpty {
                notesPills(notes: notes)
            }
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.surface)
        )
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(qualityColor)
                .frame(width: 3)
        }
    }

    // MARK: Helpers

    private var timeDisplay: String {
        if let range = window.startRange,
           let earliest = parseDate(range.earliest),
           let latest = parseDate(range.latest) {
            return "\(Self.timeFormatter.string(from: earliest)) – \(Self.timeFormatter.string(from: latest))"
        }
        guard let start = parseDate(window.start),
              let end = parseDate(window.end) else {
            return ""
        }
        return "\(Self.timeFormatter.string(from: start)) – \(Self.timeFormatter.string(from: end))"
    }

    private var confidenceBadge: some View {
        let label: String
        if let score = window.confidenceScore {
            label = "\(score)%"
        } else {
            label = window.confidence.capitalized
        }
        let color = confidenceColor
        return Text(label)
            .font(.appBody(size: 11, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private var qualityBadge: some View {
        Text(window.quality.capitalized)
            .font(.appBody(size: 11, weight: .semibold))
            .foregroundStyle(qualityColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(qualityColor.opacity(0.12))
            .clipShape(Capsule())
    }

    private var confidenceColor: Color {
        switch window.confidence {
        case "high":   return theme.success
        case "medium": return Color.orange
        default:       return theme.danger
        }
    }

    private var qualityColor: Color {
        switch window.quality {
        case "great": return theme.success
        case "good":  return theme.sleep.main
        default:      return theme.tummy.main
        }
    }

    private func sleepPressureIndicator(pressure: Double) -> some View {
        let pct = Int(pressure * 100)
        let color = pressureColor(pressure)
        return HStack(spacing: Spacing.sm) {
            Text("Sleep pressure")
                .font(.appBody(size: 11))
                .foregroundStyle(theme.textMuted)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(theme.border)
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(color)
                        .frame(width: geo.size.width * CGFloat(pressure), height: 4)
                }
            }
            .frame(height: 4)

            Text("\(pct)%")
                .font(.appBody(size: 11, weight: .medium))
                .foregroundStyle(color)
        }
    }

    private func pressureColor(_ p: Double) -> Color {
        if p < 0.4 { return theme.success }
        if p < 0.6 { return theme.tummy.main }
        if p < 0.8 { return Color.orange }
        return theme.danger
    }

    private func signalPills(signals: [String: RestSignal]) -> some View {
        let labels: [(String, String)] = [
            ("pattern", "Pattern"),
            ("pressure", "Pressure"),
            ("circadian", "Circadian"),
            ("feeding", "Feeding"),
        ]
        return HStack(spacing: Spacing.xs) {
            ForEach(labels.filter { signals[$0.0] != nil }, id: \.0) { key, label in
                Text(label)
                    .font(.appBody(size: 10, weight: .medium))
                    .foregroundStyle(theme.accent)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(theme.accent.opacity(0.08))
                    .clipShape(Capsule())
            }
        }
    }

    private func notesPills(notes: [String]) -> some View {
        let noteLabels: [String: String] = [
            "feedingMayOverlap": "May overlap with feeding",
            "noFeedingOverlap": "No feeding overlap",
        ]
        return VStack(alignment: .leading, spacing: 2) {
            ForEach(notes, id: \.self) { note in
                if let label = noteLabels[note] {
                    HStack(spacing: 3) {
                        Image(systemName: "info.circle")
                            .font(.system(size: 10))
                        Text(label)
                            .font(.appBody(size: 11))
                    }
                    .foregroundStyle(theme.textMuted)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Premium with Data") {
    RestPlannerView(
        babyId: 1,
        isPremium: true,
        restPlanData: RestPlanResponse(
            babyId: 1,
            generatedAt: "2026-03-02T10:00:00Z",
            currentState: RestCurrentState(
                isSleeping: false,
                minutesAwake: 90,
                sleepPressure: 0.55,
                lastFeedMinutesAgo: 45
            ),
            restWindows: [
                RestWindow(
                    start: "2026-03-02T11:00:00Z",
                    end: "2026-03-02T12:00:00Z",
                    durationMinutes: 60,
                    label: "morning_nap",
                    isCurrent: false,
                    hasFeedingOverlap: false,
                    notes: ["noFeedingOverlap"],
                    startRange: RestTimeRange(earliest: "2026-03-02T10:45:00Z", latest: "2026-03-02T11:15:00Z"),
                    confidenceScore: 78,
                    confidence: "high",
                    quality: "great",
                    sleepPressureAtStart: 0.65,
                    signals: ["pattern": RestSignal(time: "2026-03-02T11:00:00Z", weight: 0.4)]
                ),
                RestWindow(
                    start: "2026-03-02T14:00:00Z",
                    end: "2026-03-02T15:00:00Z",
                    durationMinutes: 60,
                    label: "afternoon_nap",
                    isCurrent: false,
                    hasFeedingOverlap: true,
                    notes: ["feedingMayOverlap"],
                    startRange: nil,
                    confidenceScore: 52,
                    confidence: "medium",
                    quality: "good",
                    sleepPressureAtStart: 0.72,
                    signals: nil
                ),
            ],
            summary: RestSummary(
                totalRestMinutesRemaining: 120,
                nextRestInMinutes: 30,
                restWindowsCount: 2,
                messageKey: "rest_soon"
            ),
            patternsUsed: RestPatternsUsed(
                avgNapDuration: 55,
                avgWakeWindow: 2.0,
                avgFeedingInterval: 180,
                dataDays: 7,
                hasEnoughData: true,
                signalsUsed: ["pattern", "pressure", "circadian"]
            )
        ),
        isLoading: false
    )
    .padding()
}

#Preview("Non-Premium") {
    RestPlannerView(
        babyId: 1,
        isPremium: false,
        restPlanData: RestPlanResponse(
            babyId: 1,
            generatedAt: nil,
            currentState: nil,
            restWindows: [
                RestWindow(
                    start: "2026-03-02T11:00:00Z",
                    end: "2026-03-02T12:00:00Z",
                    durationMinutes: 60,
                    label: "morning_nap",
                    isCurrent: false,
                    hasFeedingOverlap: false,
                    notes: nil,
                    startRange: nil,
                    confidenceScore: 78,
                    confidence: "high",
                    quality: "great",
                    sleepPressureAtStart: 0.65,
                    signals: nil
                ),
            ],
            summary: RestSummary(
                totalRestMinutesRemaining: 60,
                nextRestInMinutes: 30,
                restWindowsCount: 1,
                messageKey: "rest_soon"
            ),
            patternsUsed: RestPatternsUsed(
                avgNapDuration: 55,
                avgWakeWindow: 2.0,
                avgFeedingInterval: nil,
                dataDays: 7,
                hasEnoughData: true,
                signalsUsed: nil
            )
        ),
        isLoading: false
    )
    .padding()
}

#Preview("Loading") {
    RestPlannerView(
        babyId: 1,
        isPremium: true,
        restPlanData: nil,
        isLoading: true
    )
    .padding()
}

#Preview("No Data") {
    RestPlannerView(
        babyId: 1,
        isPremium: true,
        restPlanData: nil,
        isLoading: false
    )
    .padding()
}
