import SwiftUI

// MARK: - Card Style

/// A card modifier that applies the standard surface background, rounded corners,
/// a subtle border, and card-level shadow.
///
/// Usage:
/// ```swift
/// VStack { ... }
///     .cardStyle()
/// ```
struct CardStyleModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let theme = AppTheme.resolved(for: colorScheme)

        content
            .padding(Spacing.lg)
            .background(theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                    .stroke(theme.border, lineWidth: 1)
            )
            .shadow(
                color: AppShadow.card.color,
                radius: AppShadow.card.radius,
                x: AppShadow.card.x,
                y: AppShadow.card.y
            )
    }
}

extension View {
    /// Apply the standard card appearance (surface bg, rounded corners, shadow).
    func cardStyle() -> some View {
        modifier(CardStyleModifier())
    }
}

// MARK: - Section Header

/// Styles text as a section header: heading font, primary text color, bottom padding.
struct SectionHeaderModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let theme = AppTheme.resolved(for: colorScheme)

        content
            .font(.appHeading(size: 20, weight: .semibold))
            .foregroundStyle(theme.text)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, Spacing.sm)
    }
}

extension View {
    /// Apply section header styling (heading font, left-aligned, bottom spacing).
    func sectionHeader() -> some View {
        modifier(SectionHeaderModifier())
    }
}

// MARK: - Widget Style

/// A compact card variant used for dashboard widgets: slightly smaller padding,
/// larger corner radius, and the elevated shadow.
struct WidgetStyleModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let theme = AppTheme.resolved(for: colorScheme)

        content
            .padding(Spacing.md)
            .background(theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radii.lg, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
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

extension View {
    /// Apply the widget card appearance (compact padding, large radius).
    func widgetStyle() -> some View {
        modifier(WidgetStyleModifier())
    }
}

// MARK: - Activity Badge

/// A small pill / badge colored by an `ActivityColorSet`.
///
/// Usage:
/// ```swift
/// Text("Feeding")
///     .activityBadge(theme.feeding)
/// ```
struct ActivityBadgeModifier: ViewModifier {
    let colorSet: ActivityColorSet

    func body(content: Content) -> some View {
        content
            .font(.appBody(size: 13, weight: .semibold))
            .foregroundStyle(colorSet.text)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.xs)
            .background(colorSet.bg)
            .clipShape(Capsule())
    }
}

extension View {
    /// Wrap content in a colored activity pill / badge.
    func activityBadge(_ colorSet: ActivityColorSet) -> some View {
        modifier(ActivityBadgeModifier(colorSet: colorSet))
    }
}

// MARK: - Primary Button Style

/// A filled button style using the app's primary color.
struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        let theme = AppTheme.resolved(for: colorScheme)

        configuration.label
            .font(.appBody(size: 16, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.md)
            .background(isEnabled ? theme.primary : theme.textMuted)
            .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    /// The app's primary filled button style.
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
}

// MARK: - Secondary Button Style

/// An outlined / ghost button style using the primary color for the border and text.
struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        let theme = AppTheme.resolved(for: colorScheme)

        configuration.label
            .font(.appBody(size: 16, weight: .semibold))
            .foregroundStyle(isEnabled ? theme.primary : theme.textMuted)
            .padding(.horizontal, Spacing.xl)
            .padding(.vertical, Spacing.md)
            .background(Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                    .stroke(isEnabled ? theme.primary : theme.textMuted, lineWidth: 1.5)
            )
            .opacity(configuration.isPressed ? 0.7 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == SecondaryButtonStyle {
    /// The app's secondary outlined button style.
    static var secondary: SecondaryButtonStyle { SecondaryButtonStyle() }
}

// MARK: - Themed Background

/// Sets the full-screen background to the theme's background color.
struct ThemedBackgroundModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        let theme = AppTheme.resolved(for: colorScheme)

        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(theme.background.ignoresSafeArea())
    }
}

extension View {
    /// Fill the screen with the theme background color.
    func themedBackground() -> some View {
        modifier(ThemedBackgroundModifier())
    }
}

// MARK: - Divider

/// A themed divider line.
struct ThemedDivider: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)
        Rectangle()
            .fill(theme.border)
            .frame(height: 1)
    }
}
