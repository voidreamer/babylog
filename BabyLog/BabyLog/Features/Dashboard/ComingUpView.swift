import SwiftUI

struct ComingUpView: View {
    let items: [UpcomingItem]

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.primary)

                Text("Coming Up")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)

                Spacer()

                Text("\(items.count)")
                    .font(.appBody(size: 12, weight: .bold))
                    .foregroundStyle(theme.primary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xxs)
                    .background(theme.primaryLight.opacity(0.3))
                    .clipShape(Capsule())
            }

            // Item list
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    upcomingRow(item)

                    if index < items.count - 1 {
                        Divider()
                            .foregroundStyle(theme.borderLight)
                            .padding(.leading, 40)
                    }
                }
            }
            .padding(Spacing.md)
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
    }

    // MARK: - Row

    private func upcomingRow(_ item: UpcomingItem) -> some View {
        HStack(spacing: Spacing.md) {
            // Color dot with icon
            ZStack {
                Circle()
                    .fill(colorForItem(item).opacity(0.15))
                    .frame(width: 32, height: 32)

                Image(systemName: iconForType(item.type))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(colorForItem(item))
            }

            // Content
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(item.title)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)
                    .lineLimit(1)

                HStack(spacing: Spacing.sm) {
                    // Type badge
                    Text(typeLabel(item.type))
                        .font(.appBody(size: 11, weight: .medium))
                        .foregroundStyle(colorForItem(item))
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 2)
                        .background(colorForItem(item).opacity(0.1))
                        .clipShape(Capsule())

                    // Dosage
                    if let dosage = item.dosage, !dosage.isEmpty {
                        Text(dosage)
                            .font(.appBody(size: 12))
                            .foregroundStyle(theme.textMuted)
                    }

                    // Frequency
                    if let frequency = item.frequency, !frequency.isEmpty {
                        Text(frequency)
                            .font(.appBody(size: 12))
                            .foregroundStyle(theme.textMuted)
                    }
                }
            }

            Spacer()

            // Date
            if let dateString = item.date {
                VStack(alignment: .trailing, spacing: Spacing.xxs) {
                    Text(formatUpcomingDate(dateString))
                        .font(.appBody(size: 12, weight: .semibold))
                        .foregroundStyle(theme.textSecondary)

                    if let daysAway = daysUntil(dateString) {
                        Text(daysAway)
                            .font(.appBody(size: 11))
                            .foregroundStyle(urgencyColor(dateString))
                    }
                }
            }
        }
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Color & Icon Helpers

    private func colorForItem(_ item: UpcomingItem) -> Color {
        // Try to use the color provided by the API
        if !item.color.isEmpty {
            return Color(hex: item.color)
        }

        // Fallback based on type
        switch item.type.lowercased() {
        case "vaccination":
            return theme.potty.main
        case "doctor_visit", "doctor visit":
            return theme.sleep.main
        case "medication":
            return theme.supplementAction
        default:
            return theme.primary
        }
    }

    private func iconForType(_ type: String) -> String {
        switch type.lowercased() {
        case "vaccination":
            return "syringe.fill"
        case "doctor_visit", "doctor visit":
            return "stethoscope"
        case "medication":
            return "pill.fill"
        default:
            return "calendar"
        }
    }

    private func typeLabel(_ type: String) -> String {
        switch type.lowercased() {
        case "vaccination":
            return "Vaccine"
        case "doctor_visit", "doctor visit":
            return "Visit"
        case "medication":
            return "Medication"
        default:
            return type.capitalized
        }
    }

    // MARK: - Date Formatting

    private func formatUpcomingDate(_ dateString: String) -> String {
        guard let date = parseDate(dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    private func daysUntil(_ dateString: String) -> String? {
        guard let date = parseDate(dateString) else { return nil }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let target = calendar.startOfDay(for: date)
        let components = calendar.dateComponents([.day], from: today, to: target)

        guard let days = components.day else { return nil }

        if days == 0 {
            return "Today"
        } else if days == 1 {
            return "Tomorrow"
        } else if days < 0 {
            return "\(abs(days))d overdue"
        } else if days <= 7 {
            return "In \(days) days"
        } else if days <= 30 {
            let weeks = days / 7
            return "In \(weeks) wk\(weeks == 1 ? "" : "s")"
        } else {
            let months = days / 30
            return "In \(months) mo\(months == 1 ? "" : "s")"
        }
    }

    private func urgencyColor(_ dateString: String) -> Color {
        guard let date = parseDate(dateString) else { return theme.textMuted }
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let target = calendar.startOfDay(for: date)
        let components = calendar.dateComponents([.day], from: today, to: target)
        let days = components.day ?? 0

        if days < 0 {
            return theme.danger
        } else if days == 0 {
            return theme.supplementAction
        } else if days <= 3 {
            return theme.tummy.main
        } else {
            return theme.textMuted
        }
    }

    private func parseDate(_ string: String) -> Date? {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        df.timeZone = TimeZone(secondsFromGMT: 0)

        // Try ISO 8601 with time
        let isoFractional = ISO8601DateFormatter()
        isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = isoFractional.date(from: string) { return date }

        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        if let date = iso.date(from: string) { return date }

        // Try date-only
        df.dateFormat = "yyyy-MM-dd"
        return df.date(from: string)
    }
}

// MARK: - Preview

#Preview {
    ComingUpView(items: [
        UpcomingItem(
            type: "vaccination",
            title: "DTaP - Dose 3",
            date: "2026-03-15",
            frequency: nil,
            dosage: nil,
            color: "#9878b8"
        ),
        UpcomingItem(
            type: "doctor_visit",
            title: "9-Month Checkup",
            date: "2026-03-20",
            frequency: nil,
            dosage: nil,
            color: "#6a9cb8"
        ),
        UpcomingItem(
            type: "medication",
            title: "Vitamin D Drops",
            date: "2026-03-01",
            frequency: "Daily",
            dosage: "400 IU",
            color: "#f97316"
        ),
    ])
    .padding()
}
