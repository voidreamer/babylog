import SwiftUI

/// An animated empty-state placeholder with themed icon, title, subtitle, and optional action button.
struct EmptyStateView: View {
    let icon: String
    let title: String
    var subtitle: String?
    var actionLabel: String?
    var accentColor: Color?
    var action: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme
    @State private var appeared = false

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)
        let accent = accentColor ?? theme.primary

        VStack(spacing: Spacing.xl) {
            // Animated illustration area
            ZStack {
                // Background circles
                Circle()
                    .fill(accent.opacity(0.06))
                    .frame(width: 120, height: 120)
                    .scaleEffect(appeared ? 1.0 : 0.5)

                Circle()
                    .fill(accent.opacity(0.1))
                    .frame(width: 80, height: 80)
                    .scaleEffect(appeared ? 1.0 : 0.3)

                Image(systemName: icon)
                    .font(.system(size: 36, weight: .medium))
                    .foregroundStyle(accent.opacity(0.6))
                    .scaleEffect(appeared ? 1.0 : 0.4)
            }
            .floating(amplitude: 4, duration: 3.0)

            VStack(spacing: Spacing.sm) {
                Text(title)
                    .font(.appHeading(size: 20, weight: .semibold))
                    .foregroundStyle(theme.text)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)

                if let subtitle {
                    Text(subtitle)
                        .font(.appBody(size: 15))
                        .foregroundStyle(theme.textSecondary)
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 8)
                }
            }

            if let actionLabel, let action {
                Button(action: action) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .bold))
                        Text(actionLabel)
                            .font(.appBody(size: 15, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(
                        Capsule()
                            .fill(accent)
                    )
                }
                .buttonStyle(.scalePress)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 12)
            }
        }
        .padding(Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            withAnimation(.appGentle.delay(0.1)) {
                appeared = true
            }
        }
    }
}

// MARK: - Error State View

/// A friendly error state with retry button.
struct ErrorStateView: View {
    let message: String
    var onRetry: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        EmptyStateView(
            icon: "exclamationmark.icloud",
            title: "Something went wrong",
            subtitle: message,
            actionLabel: onRetry != nil ? "Try Again" : nil,
            accentColor: theme.danger,
            action: onRetry
        )
    }
}

// MARK: - Preview

#Preview("Empty — Default") {
    EmptyStateView(
        icon: "moon.zzz",
        title: "No sleep entries",
        subtitle: "Tap the button below to log your first sleep session.",
        actionLabel: "Log Sleep"
    ) {
        // action
    }
}

#Preview("Error State") {
    ErrorStateView(message: "Could not load data. Check your connection.") {
        // retry
    }
}
