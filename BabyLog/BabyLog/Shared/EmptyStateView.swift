import SwiftUI

/// An empty-state placeholder with icon, title, subtitle, and optional action button.
///
/// Usage:
/// ```swift
/// EmptyStateView(
///     icon: "moon.zzz",
///     title: "No sleep entries",
///     subtitle: "Tap the button below to log sleep.",
///     actionLabel: "Log Sleep"
/// ) {
///     showAddSleep = true
/// }
/// ```
struct EmptyStateView: View {
    let icon: String
    let title: String
    var subtitle: String?
    var actionLabel: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            VStack(spacing: 6) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(.primary)

                if let subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }

            if let actionLabel, let action {
                Button(action: action) {
                    Text(actionLabel)
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 20)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.Light.primary)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    EmptyStateView(
        icon: "moon.zzz",
        title: "No sleep entries",
        subtitle: "Tap the button below to log sleep.",
        actionLabel: "Log Sleep"
    ) {
        // action
    }
}
