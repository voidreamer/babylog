import SwiftUI

struct RestPlannerWidget: View {
    let restPlanData: RestPlanResponse?
    var onTapInsights: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Body

    var body: some View {
        if let data = restPlanData,
           data.patternsUsed?.hasEnoughData == true,
           !data.restWindows.isEmpty {
            Button {
                onTapInsights?()
            } label: {
                cardContent(data: data)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Card Content

    private func cardContent(data: RestPlanResponse) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header
            HStack(spacing: Spacing.xs) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Rest Planner")
                    .font(.appBody(size: 13, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)

                Spacer()

                HStack(spacing: Spacing.xxs) {
                    Text("View plan")
                        .font(.appBody(size: 13, weight: .medium))
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                }
                .foregroundStyle(theme.primary)
            }

            // Summary message
            if let summary = data.summary {
                summaryRow(summary: summary)
            }

            // Compact timeline bar
            CompactRestTimelineBar(windows: data.restWindows, theme: theme)

            // Next window pill
            if let nextWindow = data.restWindows.first(where: { !$0.isCurrent }) ?? data.restWindows.first {
                nextWindowPill(window: nextWindow)
            }
        }
        .padding(Spacing.lg)
        .background(theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .stroke(theme.borderLight, lineWidth: 0.5)
        )
        .shadow(
            color: AppShadow.card.color,
            radius: AppShadow.card.radius,
            x: AppShadow.card.x,
            y: AppShadow.card.y
        )
    }

    // MARK: - Summary Row

    private func summaryRow(summary: RestSummary) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: summaryIcon(summary.messageKey))
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(summaryColor(summary.messageKey))

            VStack(alignment: .leading, spacing: 1) {
                Text(summaryMessage(summary))
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
        .padding(Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(summaryColor(summary.messageKey).opacity(0.08))
        )
        .overlay(alignment: .leading) {
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(summaryColor(summary.messageKey))
                .frame(width: 3)
        }
    }

    // MARK: - Next Window Pill

    private func nextWindowPill(window: RestWindow) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "arrow.right.circle.fill")
                .font(.system(size: 12))
                .foregroundStyle(theme.accent)

            Text("Next: \(formatLabel(window.label)) \u{00b7} \(window.durationMinutes) min")
                .font(.appBody(size: 12, weight: .medium))
                .foregroundStyle(theme.textSecondary)

            if let score = window.confidenceScore {
                Text("\(score)%")
                    .font(.appBody(size: 11, weight: .semibold))
                    .foregroundStyle(confidenceColor(window.confidence))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(confidenceColor(window.confidence).opacity(0.12))
                    .clipShape(Capsule())
            }

            Spacer()
        }
    }

    // MARK: - Helpers

    private func summaryIcon(_ key: String) -> String {
        switch key {
        case "rest_now":   return "moon.fill"
        case "rest_soon":  return "cup.and.saucer.fill"
        case "rest_later": return "cup.and.saucer.fill"
        default:           return "exclamationmark.circle"
        }
    }

    private func summaryMessage(_ summary: RestSummary) -> String {
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

    private func summaryColor(_ key: String) -> Color {
        switch key {
        case "rest_now":   return theme.success
        case "rest_soon":  return theme.sleep.main
        case "rest_later": return Color.orange
        default:           return theme.textMuted
        }
    }

    private func formatLabel(_ label: String) -> String {
        label.replacingOccurrences(of: "_", with: " ").capitalized
    }

    private func confidenceColor(_ confidence: String) -> Color {
        switch confidence {
        case "high":   return theme.success
        case "medium": return Color.orange
        default:       return theme.textMuted
        }
    }
}

// MARK: - Compact Timeline Bar

private struct CompactRestTimelineBar: View {
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
            VStack(spacing: Spacing.xxs) {
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

// MARK: - Preview

#Preview("With Data") {
    RestPlannerWidget(
        restPlanData: RestPlanResponse(
            babyId: 1,
            generatedAt: "2026-03-02T10:00:00Z",
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
                RestWindow(
                    start: "2026-03-02T14:00:00Z",
                    end: "2026-03-02T15:00:00Z",
                    durationMinutes: 60,
                    label: "afternoon_nap",
                    isCurrent: false,
                    hasFeedingOverlap: true,
                    notes: nil,
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
                avgFeedingInterval: nil,
                dataDays: 7,
                hasEnoughData: true,
                signalsUsed: nil
            )
        )
    )
    .padding()
}

#Preview("No Data") {
    RestPlannerWidget(restPlanData: nil)
        .padding()
}
