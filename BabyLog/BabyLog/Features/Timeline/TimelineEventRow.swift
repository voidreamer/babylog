import SwiftUI

struct TimelineEventRow: View {
    let event: TimelineEvent
    var isFirst: Bool = false
    var isLast: Bool = false

    @Environment(\.colorScheme) private var colorScheme
    @State private var isExpanded = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            // MARK: - Left: timeline indicator
            timelineIndicator

            // MARK: - Right: content
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Header row: type label + time
                HStack {
                    Text(displayName)
                        .font(.appBody(size: 15, weight: .semibold))
                        .foregroundStyle(activityColorSet.text)

                    Spacer()

                    Text(formattedTime)
                        .font(.appBody(size: 13, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                }

                // Summary detail
                if let summary = summaryText {
                    Text(summary)
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textSecondary)
                }

                // Expanded details
                if isExpanded {
                    expandedDetails
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(Spacing.md)
            .background(activityColorSet.bg.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: Radii.sm, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                    .stroke(activityColorSet.main.opacity(0.2), lineWidth: 1)
            )
        }
        .padding(.vertical, Spacing.xs)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.2)) {
                isExpanded.toggle()
            }
        }
    }

    // MARK: - Timeline Indicator

    private var timelineIndicator: some View {
        VStack(spacing: 0) {
            // Top connector line
            Rectangle()
                .fill(isFirst ? Color.clear : theme.border)
                .frame(width: 2, height: 12)

            // Circle icon
            ZStack {
                Circle()
                    .fill(activityColorSet.main)
                    .frame(width: 28, height: 28)

                Image(systemName: iconName)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
            }

            // Bottom connector line
            Rectangle()
                .fill(isLast ? Color.clear : theme.border)
                .frame(width: 2)
                .frame(maxHeight: .infinity)
        }
        .frame(width: 28)
    }

    // MARK: - Expanded Details

    @ViewBuilder
    private var expandedDetails: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            ThemedDivider()

            // Show all detail fields
            ForEach(detailItems, id: \.label) { item in
                HStack(alignment: .top) {
                    Text(item.label)
                        .font(.appBody(size: 13, weight: .semibold))
                        .foregroundStyle(theme.textMuted)
                        .frame(width: 80, alignment: .leading)

                    Text(item.value)
                        .font(.appBody(size: 13))
                        .foregroundStyle(theme.text)
                }
            }

            // Notes
            if let notes = stringDetail("notes"), !notes.isEmpty {
                HStack(alignment: .top) {
                    Text("Notes")
                        .font(.appBody(size: 13, weight: .semibold))
                        .foregroundStyle(theme.textMuted)
                        .frame(width: 80, alignment: .leading)

                    Text(notes)
                        .font(.appBody(size: 13))
                        .foregroundStyle(theme.text)
                }
            }
        }
        .padding(.top, Spacing.xs)
    }

    // MARK: - Event Type Helpers

    private var eventType: String {
        event.eventType
    }

    private var displayName: String {
        switch eventType {
        case "feeding":     return "Feeding"
        case "diaper":      return "Diaper"
        case "sleep":       return "Sleep"
        case "pumping":     return "Pumping"
        case "potty":       return "Potty"
        case "tummy_time":  return "Tummy Time"
        case "bath":        return "Bath"
        case "supplement":  return "Supplement"
        default:            return eventType.capitalized
        }
    }

    private var iconName: String {
        switch eventType {
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

    private var activityColorSet: ActivityColorSet {
        switch eventType {
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

    // MARK: - Time Formatting

    private var formattedTime: String {
        // event.time is an ISO string like "2024-03-15T10:30:00Z" or "2024-03-15T10:30:00.000Z"
        let timeString = event.time

        // Try ISO 8601 with fractional seconds
        let isoFractional = ISO8601DateFormatter()
        isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFractional.date(from: timeString) {
            return formatTimeOfDay(date)
        }

        // Try ISO 8601 without fractional seconds
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: timeString) {
            return formatTimeOfDay(date)
        }

        // Fallback: return raw time
        return timeString
    }

    private func formatTimeOfDay(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        formatter.locale = Locale.current
        return formatter.string(from: date)
    }

    // MARK: - Summary Text

    private var summaryText: String? {
        switch eventType {
        case "feeding":
            return feedingSummary
        case "diaper":
            return diaperSummary
        case "sleep":
            return sleepSummary
        case "pumping":
            return pumpingSummary
        case "potty":
            return pottySummary
        case "tummy_time":
            return tummySummary
        case "bath":
            return nil // Bath typically has no key detail
        case "supplement":
            return supplementSummary
        default:
            return nil
        }
    }

    private var feedingSummary: String? {
        var parts: [String] = []
        if let type = stringDetail("type") {
            parts.append(type.capitalized)
        }
        if let duration = numberDetail("duration_minutes") {
            parts.append("\(Int(duration)) min")
        }
        if let amount = numberDetail("amount_ml") {
            parts.append("\(Int(amount)) ml")
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var diaperSummary: String? {
        if let type = stringDetail("type") {
            return type.capitalized
        }
        return nil
    }

    private var sleepSummary: String? {
        if let duration = numberDetail("duration_minutes") {
            let hours = Int(duration) / 60
            let minutes = Int(duration) % 60
            if hours > 0 {
                return "\(hours)h \(minutes)m"
            }
            return "\(minutes)m"
        }
        return nil
    }

    private var pumpingSummary: String? {
        var parts: [String] = []
        if let duration = numberDetail("duration_minutes") {
            parts.append("\(Int(duration)) min")
        }
        if let amount = numberDetail("amount_ml") {
            parts.append("\(Int(amount)) ml")
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var pottySummary: String? {
        if let result = stringDetail("result") {
            return result.capitalized
        }
        return nil
    }

    private var tummySummary: String? {
        if let duration = numberDetail("duration_minutes") {
            return "\(Int(duration)) min"
        }
        return nil
    }

    private var supplementSummary: String? {
        var parts: [String] = []
        if let name = stringDetail("name") {
            parts.append(name)
        }
        if let dosage = stringDetail("dosage") {
            parts.append(dosage)
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    // MARK: - Detail Items for Expanded View

    private struct DetailItem: Hashable {
        let label: String
        let value: String
    }

    private var detailItems: [DetailItem] {
        var items: [DetailItem] = []

        switch eventType {
        case "feeding":
            if let type = stringDetail("type") {
                items.append(DetailItem(label: "Type", value: type.capitalized))
            }
            if let duration = numberDetail("duration_minutes") {
                items.append(DetailItem(label: "Duration", value: "\(Int(duration)) min"))
            }
            if let amount = numberDetail("amount_ml") {
                items.append(DetailItem(label: "Amount", value: "\(Int(amount)) ml"))
            }

        case "diaper":
            if let type = stringDetail("type") {
                items.append(DetailItem(label: "Type", value: type.capitalized))
            }
            if let color = stringDetail("poo_color") {
                items.append(DetailItem(label: "Color", value: color.capitalized))
            }
            if let consistency = stringDetail("poo_consistency") {
                items.append(DetailItem(label: "Consistency", value: consistency.capitalized))
            }
            if let amount = stringDetail("poo_amount") {
                items.append(DetailItem(label: "Amount", value: amount.capitalized))
            }

        case "sleep":
            if let duration = numberDetail("duration_minutes") {
                let hours = Int(duration) / 60
                let minutes = Int(duration) % 60
                let formatted = hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
                items.append(DetailItem(label: "Duration", value: formatted))
            }
            if let startTime = stringDetail("start_time") {
                items.append(DetailItem(label: "Start", value: formatISOTime(startTime)))
            }
            if let endTime = stringDetail("end_time") {
                items.append(DetailItem(label: "End", value: formatISOTime(endTime)))
            }

        case "pumping":
            if let duration = numberDetail("duration_minutes") {
                items.append(DetailItem(label: "Duration", value: "\(Int(duration)) min"))
            }
            if let amount = numberDetail("amount_ml") {
                items.append(DetailItem(label: "Amount", value: "\(Int(amount)) ml"))
            }

        case "potty":
            if let result = stringDetail("result") {
                items.append(DetailItem(label: "Result", value: result.capitalized))
            }
            if let pottyType = stringDetail("potty_type") {
                items.append(DetailItem(label: "Type", value: pottyType.capitalized))
            }

        case "tummy_time":
            if let duration = numberDetail("duration_minutes") {
                items.append(DetailItem(label: "Duration", value: "\(Int(duration)) min"))
            }

        case "supplement":
            if let name = stringDetail("name") {
                items.append(DetailItem(label: "Name", value: name))
            }
            if let dosage = stringDetail("dosage") {
                items.append(DetailItem(label: "Dosage", value: dosage))
            }

        default:
            break
        }

        return items
    }

    // MARK: - Detail Accessors

    private func stringDetail(_ key: String) -> String? {
        guard let codable = event.details[key] else { return nil }
        return codable.value.base as? String
    }

    private func numberDetail(_ key: String) -> Double? {
        guard let codable = event.details[key] else { return nil }
        if let intVal = codable.value.base as? Int {
            return Double(intVal)
        }
        return codable.value.base as? Double
    }

    private func formatISOTime(_ isoString: String) -> String {
        let isoFractional = ISO8601DateFormatter()
        isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFractional.date(from: isoString) {
            return formatTimeOfDay(date)
        }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: isoString) {
            return formatTimeOfDay(date)
        }

        return isoString
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 0) {
        TimelineEventRow(
            event: TimelineEvent(
                id: 1,
                eventType: "feeding",
                time: "2024-03-15T10:30:00Z",
                details: [
                    "type": AnyCodable("breast"),
                    "duration_minutes": AnyCodable(15)
                ]
            ),
            isFirst: true,
            isLast: false
        )

        TimelineEventRow(
            event: TimelineEvent(
                id: 2,
                eventType: "diaper",
                time: "2024-03-15T09:15:00Z",
                details: [
                    "type": AnyCodable("pee")
                ]
            ),
            isFirst: false,
            isLast: false
        )

        TimelineEventRow(
            event: TimelineEvent(
                id: 3,
                eventType: "sleep",
                time: "2024-03-15T08:00:00Z",
                details: [
                    "duration_minutes": AnyCodable(90),
                    "start_time": AnyCodable("2024-03-15T06:30:00Z"),
                    "end_time": AnyCodable("2024-03-15T08:00:00Z")
                ]
            ),
            isFirst: false,
            isLast: true
        )
    }
    .padding(.horizontal, Spacing.lg)
}
