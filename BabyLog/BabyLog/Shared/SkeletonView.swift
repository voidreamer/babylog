import SwiftUI

// MARK: - Skeleton Primitives

/// A rounded rectangle skeleton placeholder with shimmer animation.
struct SkeletonRect: View {
    let width: CGFloat?
    let height: CGFloat
    let cornerRadius: CGFloat

    @Environment(\.colorScheme) private var colorScheme

    init(width: CGFloat? = nil, height: CGFloat = 16, cornerRadius: CGFloat = 8) {
        self.width = width
        self.height = height
        self.cornerRadius = cornerRadius
    }

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(theme.border.opacity(0.3))
            .frame(width: width, height: height)
            .shimmer()
    }
}

/// A circular skeleton placeholder with shimmer animation.
struct SkeletonCircle: View {
    let size: CGFloat

    @Environment(\.colorScheme) private var colorScheme

    init(size: CGFloat = 40) {
        self.size = size
    }

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)
        Circle()
            .fill(theme.border.opacity(0.3))
            .frame(width: size, height: size)
            .shimmer()
    }
}

/// A text-line skeleton placeholder — simulates a line of text.
struct SkeletonText: View {
    let width: CGFloat
    let height: CGFloat

    @Environment(\.colorScheme) private var colorScheme

    init(width: CGFloat = 120, height: CGFloat = 12) {
        self.width = width
        self.height = height
    }

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)
        RoundedRectangle(cornerRadius: height / 2, style: .continuous)
            .fill(theme.border.opacity(0.3))
            .frame(width: width, height: height)
            .shimmer()
    }
}

// MARK: - Dashboard Skeleton

/// Mimics the exact layout of the dashboard while loading.
struct DashboardSkeleton: View {
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        VStack(spacing: Spacing.lg) {
            // Greeting header
            greetingSkeletonRow
                .padding(.horizontal, Spacing.lg)

            // Hero card
            heroCardSkeleton
                .padding(.horizontal, Spacing.lg)

            // Quick actions
            quickActionsSkeleton
                .padding(.horizontal, Spacing.lg)

            // Prediction cards
            predictionCardsSkeleton
                .padding(.horizontal, Spacing.lg)

            // Today at a glance
            glanceCardsSkeleton
                .padding(.horizontal, Spacing.lg)

            Spacer()
        }
        .padding(.top, Spacing.md)
    }

    // Greeting
    private var greetingSkeletonRow: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                SkeletonText(width: 110, height: 12)
                Spacer()
                SkeletonText(width: 90, height: 11)
            }
            SkeletonText(width: 140, height: 24)
            SkeletonText(width: 80, height: 11)
        }
    }

    // Hero card
    private var heroCardSkeleton: some View {
        HStack(spacing: Spacing.md) {
            SkeletonCircle(size: 68)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                SkeletonText(width: 150, height: 14)
                HStack(spacing: Spacing.xs) {
                    SkeletonRect(width: 50, height: 20, cornerRadius: 10)
                    SkeletonRect(width: 40, height: 20, cornerRadius: 10)
                }
            }

            Spacer()
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
                .fill(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
        )
    }

    // Quick actions
    private var quickActionsSkeleton: some View {
        HStack(spacing: 0) {
            ForEach(0..<5, id: \.self) { _ in
                VStack(spacing: Spacing.xs) {
                    SkeletonCircle(size: 48)
                    SkeletonText(width: 30, height: 9)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // Prediction cards
    private var predictionCardsSkeleton: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            SkeletonText(width: 80, height: 12)
            HStack(spacing: Spacing.sm) {
                predictionCardPlaceholder
                predictionCardPlaceholder
            }
        }
    }

    private var predictionCardPlaceholder: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            SkeletonText(width: 70, height: 11)
            SkeletonText(width: 50, height: 20)
            SkeletonText(width: 40, height: 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .fill(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
        )
    }

    // Today at a Glance
    private var glanceCardsSkeleton: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            SkeletonText(width: 50, height: 14)
            HStack(spacing: Spacing.sm) {
                glanceCardPlaceholder
                glanceCardPlaceholder
                glanceCardPlaceholder
            }
        }
    }

    private var glanceCardPlaceholder: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            SkeletonText(width: 40, height: 10)
            SkeletonText(width: 35, height: 14)
            SkeletonRect(height: 6, cornerRadius: 3)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .fill(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
        )
    }
}

// MARK: - Timeline Skeleton

/// Mimics the timeline hour grid while loading.
struct TimelineSkeleton: View {
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Calendar strip skeleton
            HStack(spacing: Spacing.sm) {
                ForEach(0..<7, id: \.self) { _ in
                    VStack(spacing: Spacing.xs) {
                        SkeletonText(width: 14, height: 10)
                        SkeletonCircle(size: 32)
                    }
                }
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.bottom, Spacing.md)

            // Hour grid
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(6..<18, id: \.self) { hour in
                        HStack(spacing: 0) {
                            SkeletonText(width: 42, height: 10)
                                .padding(.trailing, Spacing.sm)

                            Rectangle()
                                .fill(theme.border.opacity(0.2))
                                .frame(height: 0.5)

                            // Random event block on some hours
                            if hour % 3 == 0 {
                                SkeletonRect(width: 140, height: 28, cornerRadius: Radii.sm)
                                    .padding(.leading, Spacing.sm)
                            }
                        }
                        .frame(height: 80)
                    }
                }
                .padding(.trailing, Spacing.md)
            }
        }
    }
}

// MARK: - Health Skeleton

/// Card grid skeleton for the health tab.
struct HealthSkeleton: View {
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                ForEach(0..<4, id: \.self) { _ in
                    healthCardPlaceholder
                }
            }
            .padding(Spacing.lg)
        }
    }

    private var healthCardPlaceholder: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                SkeletonCircle(size: 20)
                SkeletonText(width: 100, height: 13)
                Spacer()
            }
            SkeletonText(width: 180, height: 18)
            SkeletonText(width: 120, height: 12)
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .fill(theme.surface)
                .shadow(color: AppShadow.card.color, radius: AppShadow.card.radius, x: 0, y: 2)
        )
    }
}

// MARK: - Insights Skeleton

/// Chart + stat row skeleton for the insights tab.
struct InsightsSkeleton: View {
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Chart area
                SkeletonRect(height: 180, cornerRadius: Radii.md)
                    .padding(.horizontal, Spacing.lg)

                // Stat rows
                ForEach(0..<3, id: \.self) { _ in
                    statRowPlaceholder
                        .padding(.horizontal, Spacing.lg)
                }
            }
            .padding(.vertical, Spacing.md)
        }
    }

    private var statRowPlaceholder: some View {
        HStack(spacing: Spacing.md) {
            SkeletonCircle(size: 36)
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonText(width: 100, height: 13)
                SkeletonText(width: 60, height: 11)
            }
            Spacer()
            SkeletonText(width: 50, height: 18)
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .fill(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
        )
    }
}
