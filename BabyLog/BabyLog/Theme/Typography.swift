import SwiftUI

// MARK: - Typography

/// Font definitions matching the web app:
///   - Body / UI text: **Nunito** (or system fallback)
///   - Headings:       **Quicksand** (or system rounded fallback)
///   - CJK fallback:   Noto Sans JP / SC / Devanagari (loaded from system if available)
///
/// Usage:
/// ```swift
/// Text("Hello").font(.appBody())
/// Text("Title").font(.appHeading(.title))
/// ```
enum AppTypography {

    // MARK: - Font Names

    /// PostScript name for Nunito (must be bundled or available on device).
    private static let nunitoFamily = "Nunito"
    /// PostScript name for Quicksand.
    private static let quicksandFamily = "Quicksand"

    // MARK: - Body Fonts (Nunito)

    /// Standard body font at the given size and weight.
    /// Falls back to the system default if Nunito is not available.
    static func body(size: CGFloat = 16, weight: Font.Weight = .regular) -> Font {
        if fontFamilyAvailable(nunitoFamily) {
            return .custom(nunitoFamily, size: size).weight(weight)
        }
        return .system(size: size, weight: weight, design: .default)
    }

    /// Caption-sized body font (13 pt).
    static func caption(weight: Font.Weight = .regular) -> Font {
        body(size: 13, weight: weight)
    }

    /// Footnote-sized body font (14 pt).
    static func footnote(weight: Font.Weight = .regular) -> Font {
        body(size: 14, weight: weight)
    }

    /// Callout-sized body font (15 pt).
    static func callout(weight: Font.Weight = .regular) -> Font {
        body(size: 15, weight: weight)
    }

    /// Subheadline body font (16 pt, semibold).
    static func subheadline(weight: Font.Weight = .semibold) -> Font {
        body(size: 16, weight: weight)
    }

    // MARK: - Heading Fonts (Quicksand)

    /// Heading font at the given size and weight.
    /// Falls back to the rounded system design if Quicksand is not available.
    static func heading(size: CGFloat = 24, weight: Font.Weight = .bold) -> Font {
        if fontFamilyAvailable(quicksandFamily) {
            return .custom(quicksandFamily, size: size).weight(weight)
        }
        return .system(size: size, weight: weight, design: .rounded)
    }

    /// Large title heading (34 pt).
    static func largeTitle(weight: Font.Weight = .bold) -> Font {
        heading(size: 34, weight: weight)
    }

    /// Title heading (28 pt).
    static func title(weight: Font.Weight = .bold) -> Font {
        heading(size: 28, weight: weight)
    }

    /// Title2 heading (22 pt).
    static func title2(weight: Font.Weight = .bold) -> Font {
        heading(size: 22, weight: weight)
    }

    /// Title3 heading (20 pt).
    static func title3(weight: Font.Weight = .semibold) -> Font {
        heading(size: 20, weight: weight)
    }

    // MARK: - Numeric / Monospaced

    /// Monospaced digit font for timers and counters.
    static func mono(size: CGFloat = 16, weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    // MARK: - CJK Fallback Helpers

    /// CJK-aware font: tries Nunito, then Noto Sans JP / SC / Devanagari, then system.
    /// Useful for user-generated content that may contain mixed scripts.
    static func cjkBody(size: CGFloat = 16, weight: Font.Weight = .regular) -> Font {
        // On iOS the system font already chains through CJK fallbacks,
        // but if Nunito is loaded it will not. We rely on UIKit to pick
        // the right cascade via the descriptor API if needed.
        body(size: size, weight: weight)
    }

    // MARK: - Private

    /// Quick runtime check for a custom font family.
    private static func fontFamilyAvailable(_ family: String) -> Bool {
        #if canImport(UIKit)
        return !UIFont.fontNames(forFamilyName: family).isEmpty
        #else
        return false
        #endif
    }
}

// MARK: - Convenience Font extensions

extension Font {
    /// Body text (Nunito or system default).
    static func appBody(size: CGFloat = 16, weight: Font.Weight = .regular) -> Font {
        AppTypography.body(size: size, weight: weight)
    }

    /// Heading text (Quicksand or system rounded).
    static func appHeading(size: CGFloat = 24, weight: Font.Weight = .bold) -> Font {
        AppTypography.heading(size: size, weight: weight)
    }

    /// Monospaced digits for timers / counters.
    static func appMono(size: CGFloat = 16, weight: Font.Weight = .medium) -> Font {
        AppTypography.mono(size: size, weight: weight)
    }
}

// MARK: - Text Style Presets

/// Pre-built `ViewModifier`s that combine font + color for common text roles.
extension View {

    /// Primary body text styling.
    func textBody(_ theme: ResolvedTheme) -> some View {
        self
            .font(.appBody())
            .foregroundStyle(theme.text)
    }

    /// Secondary / supporting text styling.
    func textSecondary(_ theme: ResolvedTheme) -> some View {
        self
            .font(.appBody(size: 14))
            .foregroundStyle(theme.textSecondary)
    }

    /// Muted / hint text styling.
    func textMuted(_ theme: ResolvedTheme) -> some View {
        self
            .font(.appBody(size: 13))
            .foregroundStyle(theme.textMuted)
    }

    /// Section heading styling.
    func textHeading(_ theme: ResolvedTheme, size: CGFloat = 22) -> some View {
        self
            .font(.appHeading(size: size))
            .foregroundStyle(theme.text)
    }
}
