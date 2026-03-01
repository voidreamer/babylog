import SwiftUI

// MARK: - Activity Color Set

/// A complete color palette for a single activity type (feeding, diaper, etc.).
struct ActivityColorSet {
    /// Main / accent color for the activity.
    let main: Color
    /// A lighter tint (used for icons, tags, etc.).  Falls back to `main` when not provided.
    let light: Color
    /// Background fill for cards / badges.
    let bg: Color
    /// Foreground text that sits on top of `bg`.
    let text: Color

    init(main: Color, light: Color? = nil, bg: Color, text: Color) {
        self.main = main
        self.light = light ?? main
        self.bg = bg
        self.text = text
    }
}

// MARK: - Feeding Sub-type Colors

/// Colors for the three feeding sub-types (breast, formula, bottle).
struct FeedingSubColors {
    let breast: Color
    let formula: Color
    let bottle: Color
}

// MARK: - Diaper Sub-type Colors

/// Colors for diaper sub-types (pee, poo).
struct DiaperSubColors {
    let pee: Color
    let poo: Color
}

// MARK: - Spacing

/// Spacing tokens that mirror the 4-pt grid used in the web app.
enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}

// MARK: - Corner Radii

/// Corner radius tokens matching CSS `--radius-*` variables.
enum Radii {
    /// 12 pt  -- small chips, badges
    static let sm: CGFloat = 12
    /// 16 pt  -- cards, inputs
    static let md: CGFloat = 16
    /// 24 pt  -- modals, sheets
    static let lg: CGFloat = 24
    /// 32 pt  -- pills, FABs
    static let xl: CGFloat = 32
}

// MARK: - Shadows

/// Shadow presets for elevation levels.
enum AppShadow {
    /// Subtle card shadow.
    static let card = ShadowStyle(
        color: Color.black.opacity(0.06),
        radius: 8,
        x: 0,
        y: 2
    )
    /// Elevated element (modals, popovers).
    static let elevated = ShadowStyle(
        color: Color.black.opacity(0.12),
        radius: 16,
        x: 0,
        y: 4
    )
}

/// Lightweight value type to keep shadow parameters together.
struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

// MARK: - Resolved Theme

/// A fully-resolved set of semantic colors for the current appearance.
/// Instantiate via `AppTheme.resolved(for:)` so every view can read
/// pre-computed colors without branching on `colorScheme` itself.
struct ResolvedTheme {

    // Core
    let primary: Color
    let primaryDark: Color
    let primaryLight: Color

    // Backgrounds
    let background: Color
    let surface: Color
    let surfaceHover: Color

    // Borders
    let border: Color
    let borderLight: Color

    // Text
    let text: Color
    let textSecondary: Color
    let textMuted: Color

    // Semantic
    let danger: Color
    let success: Color
    let accent: Color

    // Activity sets
    let feeding: ActivityColorSet
    let diaper: ActivityColorSet
    let sleep: ActivityColorSet
    let pumping: ActivityColorSet
    let potty: ActivityColorSet
    let tummy: ActivityColorSet
    let bath: ActivityColorSet

    // Sub-type colors
    let feedingSub: FeedingSubColors
    let diaperSub: DiaperSubColors

    // Supplement
    let supplementAction: Color
}

// MARK: - Theme Factory

enum AppTheme {

    /// Build a `ResolvedTheme` for the given color scheme.
    static func resolved(for scheme: ColorScheme) -> ResolvedTheme {
        switch scheme {
        case .dark:
            return darkTheme
        default:
            return lightTheme
        }
    }

    // MARK: Light

    private static let lightTheme = ResolvedTheme(
        primary: AppColors.Light.primary,
        primaryDark: AppColors.Light.primaryDark,
        primaryLight: AppColors.Light.primaryLight,
        background: AppColors.Light.background,
        surface: AppColors.Light.surface,
        surfaceHover: AppColors.Light.surfaceHover,
        border: AppColors.Light.border,
        borderLight: AppColors.Light.borderLight,
        text: AppColors.Light.text,
        textSecondary: AppColors.Light.textSecondary,
        textMuted: AppColors.Light.textMuted,
        danger: AppColors.Light.danger,
        success: AppColors.Light.success,
        accent: AppColors.Light.accent,
        feeding: ActivityColorSet(
            main: AppColors.Light.feeding,
            light: AppColors.Light.feedingLight,
            bg: AppColors.Light.feedingBg,
            text: AppColors.Light.feedingText
        ),
        diaper: ActivityColorSet(
            main: AppColors.Light.diaper,
            light: AppColors.Light.diaperLight,
            bg: AppColors.Light.diaperBg,
            text: AppColors.Light.diaperText
        ),
        sleep: ActivityColorSet(
            main: AppColors.Light.sleep,
            light: AppColors.Light.sleepLight,
            bg: AppColors.Light.sleepBg,
            text: AppColors.Light.sleepText
        ),
        pumping: ActivityColorSet(
            main: AppColors.Light.pumping,
            light: AppColors.Light.pumpingLight,
            bg: AppColors.Light.pumpingBg,
            text: AppColors.Light.pumpingText
        ),
        potty: ActivityColorSet(
            main: AppColors.Light.potty,
            light: AppColors.Light.pottyLight,
            bg: AppColors.Light.pottyBg,
            text: AppColors.Light.pottyText
        ),
        tummy: ActivityColorSet(
            main: AppColors.Light.tummy,
            light: AppColors.Light.tummyLight,
            bg: AppColors.Light.tummyBg,
            text: AppColors.Light.tummyText
        ),
        bath: ActivityColorSet(
            main: AppColors.Light.bath,
            light: AppColors.Light.bathLight,
            bg: AppColors.Light.bathBg,
            text: AppColors.Light.bathText
        ),
        feedingSub: FeedingSubColors(
            breast: AppColors.Light.feedingBreast,
            formula: AppColors.Light.feedingFormula,
            bottle: AppColors.Light.feedingBottle
        ),
        diaperSub: DiaperSubColors(
            pee: AppColors.Light.diaperPee,
            poo: AppColors.Light.diaperPoo
        ),
        supplementAction: AppColors.Light.supplementAction
    )

    // MARK: Dark

    private static let darkTheme = ResolvedTheme(
        primary: AppColors.Dark.primary,
        primaryDark: AppColors.Dark.primaryDark,
        primaryLight: AppColors.Dark.primaryLight,
        background: AppColors.Dark.background,
        surface: AppColors.Dark.surface,
        surfaceHover: AppColors.Dark.surfaceHover,
        border: AppColors.Dark.border,
        borderLight: AppColors.Dark.borderLight,
        text: AppColors.Dark.text,
        textSecondary: AppColors.Dark.textSecondary,
        textMuted: AppColors.Dark.textMuted,
        danger: AppColors.Dark.danger,
        success: AppColors.Dark.success,
        accent: AppColors.Dark.accent,
        feeding: ActivityColorSet(
            main: AppColors.Dark.feeding,
            bg: AppColors.Dark.feedingBg,
            text: AppColors.Dark.feedingText
        ),
        diaper: ActivityColorSet(
            main: AppColors.Dark.diaper,
            bg: AppColors.Dark.diaperBg,
            text: AppColors.Dark.diaperText
        ),
        sleep: ActivityColorSet(
            main: AppColors.Dark.sleep,
            bg: AppColors.Dark.sleepBg,
            text: AppColors.Dark.sleepText
        ),
        pumping: ActivityColorSet(
            main: AppColors.Dark.pumping,
            bg: AppColors.Dark.pumpingBg,
            text: AppColors.Dark.pumpingText
        ),
        potty: ActivityColorSet(
            main: AppColors.Dark.potty,
            bg: AppColors.Dark.pottyBg,
            text: AppColors.Dark.pottyText
        ),
        tummy: ActivityColorSet(
            main: AppColors.Dark.tummy,
            bg: AppColors.Dark.tummyBg,
            text: AppColors.Dark.tummyText
        ),
        bath: ActivityColorSet(
            main: AppColors.Dark.bath,
            bg: AppColors.Dark.bathBg,
            text: AppColors.Dark.bathText
        ),
        feedingSub: FeedingSubColors(
            breast: AppColors.Dark.feedingBreast,
            formula: AppColors.Dark.feedingFormula,
            bottle: AppColors.Dark.feedingBottle
        ),
        diaperSub: DiaperSubColors(
            pee: AppColors.Dark.diaperPee,
            poo: AppColors.Dark.diaperPoo
        ),
        supplementAction: AppColors.Dark.supplementAction
    )
}

// MARK: - Environment Key

/// Inject the resolved theme through the SwiftUI environment so any view
/// can access `@Environment(\.appTheme) var theme`.
private struct AppThemeKey: EnvironmentKey {
    static let defaultValue: ResolvedTheme = AppTheme.resolved(for: .light)
}

extension EnvironmentValues {
    var appTheme: ResolvedTheme {
        get { self[AppThemeKey.self] }
        set { self[AppThemeKey.self] = newValue }
    }
}
