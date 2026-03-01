import SwiftUI

// MARK: - RecentActivity Model

struct RecentActivity: Identifiable {
    let id: UUID
    let type: String
    let icon: String
    let title: String
    let detail: String?
    let time: Date
    let colors: ActivityColorSet
}

// MARK: - RecentActivityView

struct RecentActivityView: View {
    let activities: [RecentActivity]
    var onSeeAll: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Text("Recent")
                    .font(.appHeading(size: 16, weight: .semibold))
                    .foregroundStyle(theme.text)

                Spacer()

                if let onSeeAll {
                    Button {
                        onSeeAll()
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Text("See all")
                                .font(.appBody(size: 13, weight: .medium))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundStyle(theme.primary)
                    }
                }
            }

            if activities.isEmpty {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 18))
                        .foregroundStyle(theme.primary.opacity(0.5))

                    Text("No activities yet today")
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textMuted)
                }
                .padding(Spacing.lg)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(activities.prefix(4).enumerated()), id: \.element.id) { index, activity in
                        activityRow(activity)

                        if index < min(activities.count, 4) - 1 {
                            Divider()
                                .foregroundStyle(theme.borderLight)
                                .padding(.leading, 48)
                        }
                    }
                }
                .padding(.vertical, Spacing.xs)
                .background(theme.surface)
                .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
            }
        }
    }

    // MARK: - Activity Row

    private func activityRow(_ activity: RecentActivity) -> some View {
        HStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(activity.colors.bg)
                    .frame(width: 36, height: 36)

                Image(systemName: activity.icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(activity.colors.main)
            }

            // Title + detail
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(activity.title)
                    .font(.appBody(size: 14, weight: .medium))
                    .foregroundStyle(theme.text)

                if let detail = activity.detail {
                    Text(detail)
                        .font(.appBody(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }

            Spacer()

            // Relative time
            Text(relativeTime(activity.time))
                .font(.appBody(size: 12))
                .foregroundStyle(theme.textMuted)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
    }

    // MARK: - Relative Time

    private func relativeTime(_ date: Date) -> String {
        let interval = Date().timeIntervalSince(date)

        if interval < 60 {
            return "Just now"
        } else if interval < 3600 {
            return "\(Int(interval / 60))m ago"
        } else if interval < 86400 {
            return "\(Int(interval / 3600))h ago"
        } else {
            return "\(Int(interval / 86400))d ago"
        }
    }
}
