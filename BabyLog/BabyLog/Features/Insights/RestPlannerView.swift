import SwiftUI

// MARK: - RestPlannerView

struct RestPlannerView: View {

    let babyId: Int
    let isPremium: Bool
    let restPlanData: RestPlanData?
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

                // Premium badge
                if !isPremium {
                    premiumBadge(theme: theme)
                }
            }

            if isPremium {
                premiumContent(theme: theme)
            } else {
                upgradePrompt(theme: theme)
            }
        }
        .cardStyle()
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

    // MARK: - Upgrade Prompt

    private func upgradePrompt(theme: ResolvedTheme) -> some View {
        VStack(spacing: Spacing.lg) {
            // Feature icon
            ZStack {
                Circle()
                    .fill(theme.accent.opacity(0.1))
                    .frame(width: 64, height: 64)
                Image(systemName: "sparkles")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundStyle(theme.accent)
            }

            // Description
            VStack(spacing: Spacing.sm) {
                Text("Personalized Rest Schedules")
                    .font(.appHeading(size: 16, weight: .semibold))
                    .foregroundStyle(theme.text)

                Text("Get AI-powered daily schedule suggestions based on your baby's patterns, including optimal sleep and wake windows.")
                    .font(.appBody(size: 14))
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            // Feature list
            VStack(alignment: .leading, spacing: Spacing.sm) {
                featureRow(icon: "clock", text: "Optimal sleep/wake windows", theme: theme)
                featureRow(icon: "calendar", text: "Daily schedule suggestions", theme: theme)
                featureRow(icon: "moon.stars", text: "Bedtime recommendations", theme: theme)
                featureRow(icon: "chart.bar", text: "Personalized to your baby", theme: theme)
            }

            // Upgrade button
            Button {
                // Upgrade action handled by parent / settings
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "star.fill")
                    Text("Upgrade to Premium")
                }
            }
            .buttonStyle(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
    }

    // MARK: - Feature Row

    private func featureRow(icon: String, text: String, theme: ResolvedTheme) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(theme.accent)
                .frame(width: 20)
            Text(text)
                .font(.appBody(size: 14))
                .foregroundStyle(theme.textSecondary)
        }
    }

    // MARK: - Premium Content

    @ViewBuilder
    private func premiumContent(theme: ResolvedTheme) -> some View {
        if isLoading {
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
        } else if let planData = restPlanData, let plan = planData.plan, !plan.isEmpty {
            restPlanContent(plan: plan, theme: theme)
        } else {
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
    }

    // MARK: - Rest Plan Content

    private func restPlanContent(plan: [String: AnyCodable], theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            ForEach(plan.keys.sorted(), id: \.self) { key in
                if let value = plan[key] {
                    planEntry(key: key, value: value, theme: theme)
                }
            }
        }
    }

    // MARK: - Plan Entry

    private func planEntry(key: String, value: AnyCodable, theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Key as formatted title
            Text(formatPlanKey(key))
                .font(.appBody(size: 14, weight: .semibold))
                .foregroundStyle(theme.text)

            // Value display
            Text(formatPlanValue(value))
                .font(.appBody(size: 13))
                .foregroundStyle(theme.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.surface)
        )
    }

    // MARK: - Helpers

    private func formatPlanKey(_ key: String) -> String {
        key.replacingOccurrences(of: "_", with: " ")
            .capitalized
    }

    private func formatPlanValue(_ value: AnyCodable) -> String {
        let base = value.value.base

        if base is NilValue {
            return "N/A"
        } else if let string = base as? String {
            return string
        } else if let int = base as? Int {
            return "\(int)"
        } else if let double = base as? Double {
            return String(format: "%.1f", double)
        } else if let bool = base as? Bool {
            return bool ? "Yes" : "No"
        } else if let array = base as? [AnyCodable] {
            return array.map { formatPlanValue($0) }.joined(separator: ", ")
        } else if let dict = base as? [String: AnyCodable] {
            return dict.map { "\(formatPlanKey($0.key)): \(formatPlanValue($0.value))" }.joined(separator: "\n")
        }
        return String(describing: base)
    }
}

// MARK: - Preview

#Preview("Free User") {
    RestPlannerView(
        babyId: 1,
        isPremium: false,
        restPlanData: nil,
        isLoading: false
    )
    .padding()
}

#Preview("Premium - Loading") {
    RestPlannerView(
        babyId: 1,
        isPremium: true,
        restPlanData: nil,
        isLoading: true
    )
    .padding()
}

#Preview("Premium - No Data") {
    RestPlannerView(
        babyId: 1,
        isPremium: true,
        restPlanData: nil,
        isLoading: false
    )
    .padding()
}
