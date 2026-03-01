import SwiftUI

// MARK: - TimelineBlockView

struct TimelineBlockView: View {
    let events: [TimelineEvent]
    let selectedDate: Date

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Constants

    private let hourHeight: CGFloat = 80
    private let timeColumnWidth: CGFloat = 48
    private let eventPadding: CGFloat = 4

    private var totalHeight: CGFloat { 24 * hourHeight }

    private var isToday: Bool {
        Calendar.current.isDateInToday(selectedDate)
    }

    // MARK: - Body

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                ZStack(alignment: .topLeading) {
                    // Hour grid lines + labels
                    hourGrid

                    // Duration events (sleep blocks)
                    ForEach(durationEvents, id: \.event.id) { item in
                        durationBlock(item: item)
                    }

                    // Point events (feeding, diaper, etc.)
                    ForEach(positionedPointEvents, id: \.event.id) { item in
                        pointEventPill(item: item)
                    }

                    // Current time indicator
                    if isToday {
                        currentTimeIndicator
                    }
                }
                .frame(width: nil, height: totalHeight)
                .padding(.trailing, Spacing.md)
                .id("timelineGrid")
            }
            .onAppear {
                scrollToRelevantPosition(proxy: proxy)
            }
        }
    }

    // MARK: - Hour Grid

    private var hourGrid: some View {
        ForEach(0..<24, id: \.self) { hour in
            let y = CGFloat(hour) * hourHeight

            HStack(spacing: 0) {
                // Time label
                Text(hourLabel(hour))
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(theme.textMuted)
                    .frame(width: timeColumnWidth, alignment: .trailing)
                    .padding(.trailing, Spacing.sm)

                // Divider line
                Rectangle()
                    .fill(theme.border.opacity(0.3))
                    .frame(height: 0.5)
            }
            .offset(y: y - 6) // Center text on the line
        }
    }

    private func hourLabel(_ hour: Int) -> String {
        let h = hour % 12 == 0 ? 12 : hour % 12
        let ampm = hour < 12 ? "AM" : "PM"
        return "\(h) \(ampm)"
    }

    // MARK: - Current Time Indicator

    private var currentTimeIndicator: some View {
        let now = Date()
        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: now)
        let minute = calendar.component(.minute, from: now)
        let y = CGFloat(hour) * hourHeight + CGFloat(minute) / 60.0 * hourHeight

        return HStack(spacing: 0) {
            Spacer()
                .frame(width: timeColumnWidth - 4)

            Circle()
                .fill(Color.red)
                .frame(width: 8, height: 8)

            Rectangle()
                .fill(Color.red)
                .frame(height: 1.5)
        }
        .offset(y: y - 4)
    }

    // MARK: - Duration Events (Sleep)

    private struct DurationEventItem {
        let event: TimelineEvent
        let yOffset: CGFloat
        let height: CGFloat
        let colorSet: ActivityColorSet
    }

    private var durationEvents: [DurationEventItem] {
        events.compactMap { event -> DurationEventItem? in
            guard event.eventType == "sleep" else { return nil }

            // Use start_time for sleep positioning
            let timeString = stringDetail(event, key: "start_time") ?? event.time
            guard let (hour, minute) = parseTimeComponents(timeString) else { return nil }

            let durationMinutes = numberDetail(event, key: "duration_minutes") ?? 60
            let y = CGFloat(hour) * hourHeight + CGFloat(minute) / 60.0 * hourHeight
            let h = max(CGFloat(durationMinutes) / 60.0 * hourHeight, 20)

            let theme = AppTheme.resolved(for: colorScheme)
            return DurationEventItem(event: event, yOffset: y, height: h, colorSet: theme.sleep)
        }
    }

    private func durationBlock(item: DurationEventItem) -> some View {
        let eventWidth = UIScreen.main.bounds.width - timeColumnWidth - Spacing.md - Spacing.lg - eventPadding * 2

        return HStack(spacing: Spacing.xs) {
            Image(systemName: "moon.zzz")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white)

            VStack(alignment: .leading, spacing: 1) {
                Text("Sleep")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)

                if let dur = numberDetail(item.event, key: "duration_minutes") {
                    Text(formatBlockDuration(dur))
                        .font(.system(size: 9))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }

            Spacer()
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .frame(width: eventWidth, alignment: .leading)
        .frame(height: item.height, alignment: .top)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(item.colorSet.main.opacity(0.7))
        )
        .offset(x: timeColumnWidth + Spacing.sm + eventPadding, y: item.yOffset)
    }

    // MARK: - Point Events

    private struct PointEventItem {
        let event: TimelineEvent
        let yOffset: CGFloat
        let xFraction: CGFloat // 0-1 horizontal position within group
        let groupWidth: CGFloat // fraction of total width
        let colorSet: ActivityColorSet
        let icon: String
        let label: String
    }

    private var positionedPointEvents: [PointEventItem] {
        // Filter out duration events (sleep)
        let pointEvents = events.filter { $0.eventType != "sleep" }

        // Parse time and group by 15-minute windows
        struct ParsedEvent {
            let event: TimelineEvent
            let minutesSinceMidnight: Int
        }

        let parsed = pointEvents.compactMap { event -> ParsedEvent? in
            guard let (hour, minute) = parseTimeComponents(event.time) else { return nil }
            return ParsedEvent(event: event, minutesSinceMidnight: hour * 60 + minute)
        }

        // Group events within 15-minute windows
        let windowSize = 15
        var groups: [[ParsedEvent]] = []
        var used = Set<Int>()

        for (i, pe) in parsed.enumerated() {
            guard !used.contains(i) else { continue }
            var group = [pe]
            used.insert(i)
            for (j, other) in parsed.enumerated() where !used.contains(j) {
                if abs(pe.minutesSinceMidnight - other.minutesSinceMidnight) <= windowSize {
                    group.append(other)
                    used.insert(j)
                }
            }
            groups.append(group)
        }

        let theme = AppTheme.resolved(for: colorScheme)

        return groups.flatMap { group -> [PointEventItem] in
            let count = CGFloat(group.count)
            return group.enumerated().map { index, pe in
                let y = CGFloat(pe.minutesSinceMidnight) / 60.0 * hourHeight
                let colorSet = eventColorSet(for: pe.event.eventType, theme: theme)
                return PointEventItem(
                    event: pe.event,
                    yOffset: y,
                    xFraction: CGFloat(index) / count,
                    groupWidth: 1.0 / count,
                    colorSet: colorSet,
                    icon: eventIcon(for: pe.event.eventType),
                    label: eventDisplayName(for: pe.event.eventType)
                )
            }
        }
    }

    private func pointEventPill(item: PointEventItem) -> some View {
        let availableWidth = UIScreen.main.bounds.width - timeColumnWidth - Spacing.md - Spacing.lg - eventPadding * 2
        let pillWidth = availableWidth * item.groupWidth - eventPadding
        let xOffset = timeColumnWidth + Spacing.sm + eventPadding + availableWidth * item.xFraction

        return HStack(spacing: Spacing.xxs) {
            Image(systemName: item.icon)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 18, height: 18)
                .background(Circle().fill(item.colorSet.main))

            if pillWidth > 80 {
                Text(item.label)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(item.colorSet.text)
                    .lineLimit(1)

                if let summary = eventSummary(item.event) {
                    Text(summary)
                        .font(.system(size: 9))
                        .foregroundStyle(theme.textMuted)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, Spacing.xs)
        .padding(.vertical, Spacing.xxs + 1)
        .frame(width: max(pillWidth, 26))
        .background(
            Capsule()
                .fill(item.colorSet.bg)
                .overlay(Capsule().stroke(item.colorSet.main.opacity(0.3), lineWidth: 0.5))
        )
        .offset(x: xOffset, y: item.yOffset - 12)
    }

    // MARK: - Event Detail Helpers

    private func stringDetail(_ event: TimelineEvent, key: String) -> String? {
        guard let codable = event.details[key] else { return nil }
        return codable.value.base as? String
    }

    private func numberDetail(_ event: TimelineEvent, key: String) -> Double? {
        guard let codable = event.details[key] else { return nil }
        if let intVal = codable.value.base as? Int { return Double(intVal) }
        return codable.value.base as? Double
    }

    private func eventSummary(_ event: TimelineEvent) -> String? {
        switch event.eventType {
        case "feeding":
            var parts: [String] = []
            if let type = stringDetail(event, key: "type") { parts.append(type.capitalized) }
            if let ml = numberDetail(event, key: "amount_ml"), ml > 0 { parts.append("\(Int(ml))ml") }
            return parts.isEmpty ? nil : parts.joined(separator: " ")
        case "diaper":
            return stringDetail(event, key: "type")?.capitalized
        case "pumping":
            if let ml = numberDetail(event, key: "amount_ml"), ml > 0 { return "\(Int(ml))ml" }
            return nil
        case "potty":
            return stringDetail(event, key: "result")?.capitalized
        case "tummy_time":
            if let dur = numberDetail(event, key: "duration_minutes") { return "\(Int(dur))m" }
            return nil
        case "supplement":
            return stringDetail(event, key: "name")
        default:
            return nil
        }
    }

    // MARK: - Time Parsing

    private func parseTimeComponents(_ isoString: String) -> (hour: Int, minute: Int)? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)

        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }

        guard let date else { return nil }

        let calendar = Calendar.current
        let hour = calendar.component(.hour, from: date)
        let minute = calendar.component(.minute, from: date)
        return (hour, minute)
    }

    // MARK: - Scroll Helper

    private func scrollToRelevantPosition(proxy: ScrollViewProxy) {
        // Scroll to current hour if today, or first event if past
        // We use a small delay for layout to complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            if isToday {
                let currentHour = Calendar.current.component(.hour, from: Date())
                let targetOffset = max(0, CGFloat(currentHour - 1)) * hourHeight
                // ScrollViewProxy doesn't support offset directly, so we approximate
                proxy.scrollTo("timelineGrid", anchor: UnitPoint(x: 0, y: targetOffset / totalHeight))
            } else if let firstEvent = events.first,
                      let (hour, _) = parseTimeComponents(firstEvent.time) {
                let targetOffset = max(0, CGFloat(hour - 1)) * hourHeight
                proxy.scrollTo("timelineGrid", anchor: UnitPoint(x: 0, y: targetOffset / totalHeight))
            }
        }
    }

    // MARK: - Event Type Mapping

    private func eventColorSet(for type: String, theme: ResolvedTheme) -> ActivityColorSet {
        switch type {
        case "feeding":     return theme.feeding
        case "diaper":      return theme.diaper
        case "sleep":       return theme.sleep
        case "pumping":     return theme.pumping
        case "potty":       return theme.potty
        case "tummy_time":  return theme.tummy
        case "bath":        return theme.bath
        case "supplement":
            return ActivityColorSet(
                main: theme.supplementAction,
                bg: theme.supplementAction.opacity(0.15),
                text: theme.supplementAction
            )
        default:
            return ActivityColorSet(
                main: theme.textMuted,
                bg: theme.surface,
                text: theme.textSecondary
            )
        }
    }

    private func eventIcon(for type: String) -> String {
        switch type {
        case "feeding":     return "fork.knife"
        case "diaper":      return "tornado"
        case "sleep":       return "moon.zzz"
        case "pumping":     return "drop"
        case "potty":       return "toilet"
        case "tummy_time":  return "figure.play"
        case "bath":        return "bathtub"
        case "supplement":  return "pill"
        default:            return "circle"
        }
    }

    private func eventDisplayName(for type: String) -> String {
        switch type {
        case "feeding":     return "Feeding"
        case "diaper":      return "Diaper"
        case "sleep":       return "Sleep"
        case "pumping":     return "Pumping"
        case "potty":       return "Potty"
        case "tummy_time":  return "Tummy Time"
        case "bath":        return "Bath"
        case "supplement":  return "Supplement"
        default:            return type.capitalized
        }
    }

    private func formatBlockDuration(_ minutes: Double) -> String {
        let total = Int(minutes)
        let h = total / 60
        let m = total % 60
        if h > 0 && m > 0 { return "\(h)h \(m)m" }
        if h > 0 { return "\(h)h" }
        return "\(m)m"
    }
}

// MARK: - Preview

#Preview {
    TimelineBlockView(
        events: [
            TimelineEvent(
                id: 1,
                eventType: "feeding",
                time: "2024-03-15T08:30:00Z",
                details: ["type": AnyCodable("breast"), "duration_minutes": AnyCodable(15)]
            ),
            TimelineEvent(
                id: 2,
                eventType: "sleep",
                time: "2024-03-15T10:00:00Z",
                details: ["start_time": AnyCodable("2024-03-15T10:00:00Z"), "duration_minutes": AnyCodable(90)]
            ),
            TimelineEvent(
                id: 3,
                eventType: "diaper",
                time: "2024-03-15T11:45:00Z",
                details: ["type": AnyCodable("pee")]
            ),
        ],
        selectedDate: Date()
    )
    .padding()
}
