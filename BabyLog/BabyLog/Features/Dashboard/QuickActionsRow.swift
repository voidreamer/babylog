import SwiftUI

struct QuickActionsRow: View {
    let isSleeping: Bool
    let isQuickLogging: Bool
    var onFeed: (FeedingType) -> Void
    var onDiaper: (DiaperType) -> Void
    var onSleepToggle: () -> Void
    var onPump: () -> Void
    var onPotty: () -> Void
    var onTummyTime: () -> Void
    var onBath: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        HStack(spacing: 0) {
            // Feed
            Menu {
                Button { onFeed(.breast) } label: {
                    Label("Breast", systemImage: "hand.raised.fill")
                }
                Button { onFeed(.bottle) } label: {
                    Label("Bottle", systemImage: "cup.and.saucer.fill")
                }
                Button { onFeed(.formula) } label: {
                    Label("Formula", systemImage: "flask.fill")
                }
                Button { onFeed(.solid) } label: {
                    Label("Solid", systemImage: "carrot.fill")
                }
            } label: {
                actionButton(
                    icon: "fork.knife",
                    label: "Feed",
                    colors: theme.feeding
                )
            } primaryAction: {
                HapticFeedback.light()
                onFeed(.breast)
            }
            .disabled(isQuickLogging)

            // Diaper
            Menu {
                Button { onDiaper(.pee) } label: {
                    Label("Pee", systemImage: "drop.fill")
                }
                Button { onDiaper(.poo) } label: {
                    Label("Poo", systemImage: "leaf.fill")
                }
                Button { onDiaper(.mixed) } label: {
                    Label("Mixed", systemImage: "circle.dotted")
                }
            } label: {
                actionButton(
                    icon: "circle.dotted",
                    label: "Diaper",
                    colors: theme.diaper
                )
            } primaryAction: {
                HapticFeedback.light()
                onDiaper(.pee)
            }
            .disabled(isQuickLogging)

            // Sleep
            Button {
                HapticFeedback.light()
                onSleepToggle()
            } label: {
                actionButton(
                    icon: isSleeping ? "stop.fill" : "moon.zzz.fill",
                    label: isSleeping ? "End" : "Sleep",
                    colors: theme.sleep,
                    isActive: isSleeping
                )
            }
            .disabled(isQuickLogging)

            // Pump
            Button {
                HapticFeedback.light()
                onPump()
            } label: {
                actionButton(
                    icon: "drop.fill",
                    label: "Pump",
                    colors: theme.pumping
                )
            }
            .disabled(isQuickLogging)

            // More
            Menu {
                Button { onPotty() } label: {
                    Label("Potty", systemImage: "toilet.fill")
                }
                Button { onTummyTime() } label: {
                    Label("Tummy Time", systemImage: "figure.play")
                }
                Button { onBath() } label: {
                    Label("Bath", systemImage: "bathtub.fill")
                }
            } label: {
                actionButton(
                    icon: "ellipsis",
                    label: "More",
                    colors: ActivityColorSet(
                        main: theme.textSecondary,
                        bg: theme.surface,
                        text: theme.textSecondary
                    )
                )
            }
            .disabled(isQuickLogging)
        }
        .opacity(isQuickLogging ? 0.5 : 1.0)
    }

    // MARK: - Action Button

    private func actionButton(
        icon: String,
        label: String,
        colors: ActivityColorSet,
        isActive: Bool = false
    ) -> some View {
        VStack(spacing: Spacing.xs) {
            ZStack {
                Circle()
                    .fill(isActive ? colors.main : colors.bg)
                    .frame(width: 48, height: 48)
                    .shadow(
                        color: isActive ? colors.main.opacity(0.3) : .clear,
                        radius: isActive ? 6 : 0,
                        y: isActive ? 2 : 0
                    )

                if isQuickLogging {
                    ProgressView()
                        .tint(isActive ? .white : colors.main)
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(isActive ? .white : colors.main)
                }
            }
            .animation(.appSnappy, value: isActive)

            Text(label)
                .font(.appBody(size: 10, weight: .medium))
                .foregroundStyle(theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}
