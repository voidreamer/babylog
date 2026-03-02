import SwiftUI

// MARK: - TimelineBlockView

struct TimelineBlockView: View {
    let events: [TimelineEvent]
    let selectedDate: Date
    var onEdit: ((TimelineEvent) -> Void)?
    var onDelete: ((TimelineEvent) -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Constants

    private let hourHeight: CGFloat = 80
    private let timeColumnWidth: CGFloat = 52
    private let eventPadding: CGFloat = 3

    private var isToday: Bool {
        Calendar.current.isDateInToday(selectedDate)
    }

    // MARK: - Day Boundaries

    private var selectedDayStart: Date {
        Calendar.current.startOfDay(for: selectedDate)
    }

    private var selectedDayEnd: Date {
        Calendar.current.date(byAdding: .day, value: 1, to: selectedDayStart)!
    }

    // MARK: - Display Hour Range

    private var displayHourRange: ClosedRange<Int> {
        let items = layoutEvents
        guard !items.isEmpty else { return 0...23 }

        let minMins = items.map(\.startMinutes).min() ?? 0
        let maxMins = items.map(\.endMinutes).max() ?? 1440

        let start = max(0, minMins / 60 - 1)
        let end = min(23, maxMins / 60 + 1)
        guard start <= end else { return 0...23 }
        return start...end
    }

    private var gridHeight: CGFloat {
        CGFloat(displayHourRange.count) * hourHeight
    }

    private var baseHour: Int {
        displayHourRange.lowerBound
    }

    private func yPosition(hour: Int, minute: Int) -> CGFloat {
        CGFloat(hour - baseHour) * hourHeight + CGFloat(minute) / 60.0 * hourHeight
    }

    // MARK: - Body

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                ZStack(alignment: .topLeading) {
                    Color.clear
                        .frame(height: gridHeight)

                    hourGrid

                    ForEach(layoutEvents) { item in
                        eventBlock(item: item)
                    }

                    if isToday {
                        currentTimeIndicator
                    }
                }
                .padding(.trailing, Spacing.md)
            }
            .onAppear {
                scrollToRelevantPosition(proxy: proxy)
            }
        }
    }

    // MARK: - Hour Grid

    private var hourGrid: some View {
        ForEach(Array(displayHourRange), id: \.self) { hour in
            let y = yPosition(hour: hour, minute: 0)

            HStack(spacing: 0) {
                Text(hourLabel(hour))
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(theme.textMuted)
                    .frame(width: timeColumnWidth, alignment: .trailing)
                    .padding(.trailing, Spacing.sm)

                DashedLine()
                    .stroke(style: StrokeStyle(lineWidth: 0.5, dash: [4, 3]))
                    .foregroundStyle(theme.border.opacity(0.4))
                    .frame(height: 0.5)
            }
            .id("hour-\(hour)")
            .offset(y: y - 6)
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
        let y = yPosition(hour: hour, minute: minute)

        return HStack(spacing: 0) {
            Spacer().frame(width: timeColumnWidth - 4)
            Circle().fill(Color.red).frame(width: 8, height: 8)
            Rectangle().fill(Color.red).frame(height: 1.5)
        }
        .offset(y: y - 4)
    }

    // MARK: - Unified Layout Events with Column Algorithm

    private struct LayoutEvent: Identifiable {
        var id: String { "\(event.eventType)-\(event.id)" }
        let event: TimelineEvent
        let startMinutes: Int
        let endMinutes: Int
        var column: Int
        var totalColumns: Int
        let visibleStartHour: Int
        let visibleStartMinute: Int
        let visibleDurationMinutes: Double
        let timeLabel: String
        let summaryLabel: String
        let icon: String
        let colorSet: ActivityColorSet
    }

    private var layoutEvents: [LayoutEvent] {
        let calendar = Calendar.current
        let dayStart = selectedDayStart

        var items: [LayoutEvent] = []

        for event in events {
            guard let startDate = parseDate(event.time) else { continue }

            let visibleStart: Date
            let visibleEnd: Date

            if event.eventType == "sleep" {
                let endDate: Date
                if let endStr = stringDetail(event, key: "end_time"), let parsed = parseDate(endStr) {
                    endDate = parsed
                } else if let dur = numberDetail(event, key: "duration_minutes"), dur > 0 {
                    endDate = startDate.addingTimeInterval(dur * 60)
                } else {
                    endDate = min(Date(), selectedDayEnd)
                }
                visibleStart = max(startDate, selectedDayStart)
                visibleEnd = min(endDate, selectedDayEnd)
                guard visibleEnd > visibleStart else { continue }
            } else {
                guard startDate >= selectedDayStart && startDate < selectedDayEnd else { continue }
                visibleStart = startDate
                if let dur = numberDetail(event, key: "duration_minutes"), dur > 0 {
                    visibleEnd = min(startDate.addingTimeInterval(dur * 60), selectedDayEnd)
                } else {
                    visibleEnd = startDate.addingTimeInterval(15 * 60) // 15-min default slot
                }
            }

            let startMins = max(0, Int(visibleStart.timeIntervalSince(dayStart) / 60))
            let endMins = min(1440, Int(visibleEnd.timeIntervalSince(dayStart) / 60))
            guard endMins > startMins else { continue }

            let hour = calendar.component(.hour, from: visibleStart)
            let minute = calendar.component(.minute, from: visibleStart)
            let durMins = Double(endMins - startMins)

            let resolvedTheme = AppTheme.resolved(for: colorScheme)
            let colorSet = eventColorSet(for: event.eventType, theme: resolvedTheme)

            let summary: String
            if event.eventType == "sleep" {
                summary = durMins > 0 ? formatBlockDuration(durMins) : ""
            } else {
                summary = eventSummaryLabel(event)
            }

            items.append(LayoutEvent(
                event: event,
                startMinutes: startMins,
                endMinutes: endMins,
                column: 0,
                totalColumns: 1,
                visibleStartHour: hour,
                visibleStartMinute: minute,
                visibleDurationMinutes: durMins,
                timeLabel: formatEventTime(hour: hour, minute: minute),
                summaryLabel: summary,
                icon: eventIcon(for: event.eventType),
                colorSet: colorSet
            ))
        }

        items.sort { $0.startMinutes < $1.startMinutes }

        // Pass 1: Assign columns (first-fit)
        for i in items.indices {
            var usedColumns = Set<Int>()
            for j in 0..<i {
                if items[i].startMinutes < items[j].endMinutes &&
                   items[i].endMinutes > items[j].startMinutes {
                    usedColumns.insert(items[j].column)
                }
            }
            var col = 0
            while usedColumns.contains(col) { col += 1 }
            items[i].column = col
        }

        // Pass 2: Sync totalColumns across overlapping groups
        var changed = true
        while changed {
            changed = false
            for i in items.indices {
                for j in items.indices where i != j {
                    if items[i].startMinutes < items[j].endMinutes &&
                       items[i].endMinutes > items[j].startMinutes {
                        let maxTotal = max(items[i].totalColumns, items[j].totalColumns,
                                           items[i].column + 1, items[j].column + 1)
                        if items[i].totalColumns != maxTotal {
                            items[i].totalColumns = maxTotal
                            changed = true
                        }
                        if items[j].totalColumns != maxTotal {
                            items[j].totalColumns = maxTotal
                            changed = true
                        }
                    }
                }
            }
        }

        return items
    }

    // MARK: - Event Block Rendering

    @ViewBuilder
    private func eventBlock(item: LayoutEvent) -> some View {
        let availableWidth = UIScreen.main.bounds.width - timeColumnWidth - Spacing.md - Spacing.lg - eventPadding * 2
        let colWidth = availableWidth / CGFloat(item.totalColumns) - eventPadding
        let xOffset = timeColumnWidth + Spacing.sm + eventPadding +
            CGFloat(item.column) * (availableWidth / CGFloat(item.totalColumns))
        let y = yPosition(hour: item.visibleStartHour, minute: item.visibleStartMinute)
        let height = max(CGFloat(item.visibleDurationMinutes) / 60.0 * hourHeight, 30)

        Group {
            if item.event.eventType == "sleep" {
                sleepBlockContent(item: item, width: colWidth)
            } else {
                pointBlockContent(item: item, width: colWidth)
            }
        }
        .frame(width: max(colWidth, 28), height: height, alignment: .topLeading)
        .background(blockBackground(item: item))
        .contentShape(Rectangle())
        .contextMenu {
            Button {
                onEdit?(item.event)
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            Button(role: .destructive) {
                onDelete?(item.event)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        } preview: {
            eventPreview(item: item)
        }
        .offset(x: xOffset, y: y)
    }

    private func sleepBlockContent(item: LayoutEvent, width: CGFloat) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: "moon.zzz")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))

            if width > 80 {
                Text(item.timeLabel)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)

                if !item.summaryLabel.isEmpty {
                    Text(item.summaryLabel)
                        .font(.system(size: 12))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.top, Spacing.xs)
    }

    private func pointBlockContent(item: LayoutEvent, width: CGFloat) -> some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: item.icon)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 20, height: 20)
                .background(Circle().fill(item.colorSet.main))

            if width > 60 {
                Text(item.timeLabel)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(item.colorSet.text)
                    .lineLimit(1)

                Text(item.summaryLabel)
                    .font(.system(size: 11))
                    .foregroundStyle(item.colorSet.text.opacity(0.8))
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
    }

    @ViewBuilder
    private func blockBackground(item: LayoutEvent) -> some View {
        if item.event.eventType == "sleep" {
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(item.colorSet.main.opacity(0.55))
        } else {
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(item.colorSet.bg)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                        .stroke(item.colorSet.main.opacity(0.3), lineWidth: 0.5)
                )
        }
    }

    /// Rich preview shown in the context menu.
    private func eventPreview(item: LayoutEvent) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: item.icon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 32)
                    .background(Circle().fill(item.colorSet.main))

                VStack(alignment: .leading, spacing: 2) {
                    Text(eventDisplayName(item.event.eventType))
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(theme.text)

                    Text(item.timeLabel)
                        .font(.system(size: 14))
                        .foregroundStyle(theme.textSecondary)
                }
            }

            if !item.summaryLabel.isEmpty {
                Text(item.summaryLabel)
                    .font(.system(size: 14))
                    .foregroundStyle(theme.textSecondary)
            }

            // Show extra details
            if let notes = stringDetail(item.event, key: "notes"), !notes.isEmpty {
                Text(notes)
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textMuted)
                    .lineLimit(2)
            }
        }
        .padding(Spacing.md)
        .frame(width: 220, alignment: .leading)
        .background(theme.surface)
    }

    private func eventDisplayName(_ type: String) -> String {
        switch type {
        case "feeding":     return "Feeding"
        case "diaper":      return "Diaper"
        case "sleep":       return "Sleep"
        case "pumping":     return "Pumping"
        case "potty":       return "Potty"
        case "tummy", "tummy_time": return "Tummy Time"
        case "bath":        return "Bath"
        case "supplement":  return "Supplement"
        default:            return type.capitalized
        }
    }

    // MARK: - Helpers

    private func stringDetail(_ event: TimelineEvent, key: String) -> String? {
        guard let codable = event.details[key] else { return nil }
        return codable.value.base as? String
    }

    private func numberDetail(_ event: TimelineEvent, key: String) -> Double? {
        guard let codable = event.details[key] else { return nil }
        if let intVal = codable.value.base as? Int { return Double(intVal) }
        return codable.value.base as? Double
    }

    private func eventSummaryLabel(_ event: TimelineEvent) -> String {
        switch event.eventType {
        case "feeding":
            return stringDetail(event, key: "type")?.capitalized ?? "Feed"
        case "diaper":
            return stringDetail(event, key: "type")?.capitalized ?? "Diaper"
        case "pumping":
            if let ml = numberDetail(event, key: "amount_ml"), ml > 0 { return "\(Int(ml))ml" }
            return "Pump"
        case "potty":
            return stringDetail(event, key: "result")?.capitalized ?? "Potty"
        case "tummy", "tummy_time":
            if let dur = numberDetail(event, key: "duration_minutes") { return "\(Int(dur))m" }
            return "Tummy"
        case "bath":
            return "Bath"
        case "supplement":
            return stringDetail(event, key: "name") ?? "Supplement"
        default:
            return event.eventType.capitalized
        }
    }

    private func formatEventTime(hour: Int, minute: Int) -> String {
        let h = hour % 12 == 0 ? 12 : hour % 12
        let ampm = hour < 12 ? "AM" : "PM"
        return String(format: "%d:%02d %@", h, minute, ampm)
    }

    private func parseDate(_ isoString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: isoString)
    }

    private func parseTimeComponents(_ isoString: String) -> (hour: Int, minute: Int)? {
        guard let date = parseDate(isoString) else { return nil }
        let calendar = Calendar.current
        return (calendar.component(.hour, from: date), calendar.component(.minute, from: date))
    }

    private func scrollToRelevantPosition(proxy: ScrollViewProxy) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            if isToday {
                let currentHour = Calendar.current.component(.hour, from: Date())
                let targetHour = max(baseHour, currentHour - 1)
                proxy.scrollTo("hour-\(targetHour)", anchor: .top)
            } else if let firstEvent = events.first,
                      let (hour, _) = parseTimeComponents(firstEvent.time) {
                let targetHour = max(baseHour, hour - 1)
                proxy.scrollTo("hour-\(targetHour)", anchor: .top)
            }
        }
    }

    private func eventColorSet(for type: String, theme: ResolvedTheme) -> ActivityColorSet {
        switch type {
        case "feeding":     return theme.feeding
        case "diaper":      return theme.diaper
        case "sleep":       return theme.sleep
        case "pumping":     return theme.pumping
        case "potty":       return theme.potty
        case "tummy", "tummy_time": return theme.tummy
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
        case "tummy", "tummy_time": return "figure.play"
        case "bath":        return "bathtub"
        case "supplement":  return "pill"
        default:            return "circle"
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

// MARK: - Dashed Line Shape

private struct DashedLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.width, y: rect.midY))
        return path
    }
}
