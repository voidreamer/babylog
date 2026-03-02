import SwiftUI

struct WidgetCard<Content: View>: View {
    let title: String
    let icon: String
    let accentColor: Color
    let content: () -> Content

    @Environment(\.colorScheme) private var colorScheme

    init(title: String, icon: String, accentColor: Color, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.icon = icon
        self.accentColor = accentColor
        self.content = content
    }

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(accentColor)
                Text(title)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
                Spacer()
            }
            content()
        }
        .padding(Spacing.lg)
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
