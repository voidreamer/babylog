import SwiftUI

// MARK: - Hex Color Initializer

extension Color {
    /// Initialize a `Color` from a hex string (e.g. "#d4849c" or "d4849c").
    init(hex: String) {
        let sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&rgb)

        let r = Double((rgb >> 16) & 0xFF) / 255.0
        let g = Double((rgb >> 8) & 0xFF) / 255.0
        let b = Double(rgb & 0xFF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - Convenience Color Extensions

extension Color {
    /// Adaptive primary color — resolves to light or dark variant based on color scheme.
    static let appPrimary = Color(hex: "#d4849c")
}

// MARK: - Color Palette

/// All color tokens extracted from the CSS custom properties.
/// Each static property returns an adaptive `Color` that resolves for the
/// current `ColorScheme` (light / dark).
enum AppColors {

    // MARK: - Primary

    static let primary = Color("Primary", bundle: nil)
    static let primaryDark = Color("PrimaryDark", bundle: nil)
    static let primaryLight = Color("PrimaryLight", bundle: nil)

    // MARK: - Backgrounds & Surfaces

    static let background = Color("Background", bundle: nil)
    static let surface = Color("Surface", bundle: nil)
    static let surfaceHover = Color("SurfaceHover", bundle: nil)

    // MARK: - Borders

    static let border = Color("Border", bundle: nil)
    static let borderLight = Color("BorderLight", bundle: nil)

    // MARK: - Text

    static let text = Color("Text", bundle: nil)
    static let textSecondary = Color("TextSecondary", bundle: nil)
    static let textMuted = Color("TextMuted", bundle: nil)

    // MARK: - Semantic

    static let danger = Color("Danger", bundle: nil)
    static let success = Color("Success", bundle: nil)
    static let accent = Color("Accent", bundle: nil)

    // MARK: - Resolved (code-only, no asset catalog required)
    // Use these when you want guaranteed hex values without an asset catalog.

    enum Light {
        // Primary
        static let primary        = Color(hex: "#d4849c")
        static let primaryDark    = Color(hex: "#c0708a")
        static let primaryLight   = Color(hex: "#f8c8dc")

        // Backgrounds & Surfaces
        static let background     = Color(hex: "#fefdfb")
        static let surface        = Color(hex: "#fff9f5")
        static let surfaceHover   = Color(hex: "#f0ebe5")

        // Borders
        static let border         = Color(hex: "#e8e0dc")
        static let borderLight    = Color(hex: "#f0e8e4")

        // Text
        static let text           = Color(hex: "#4a4044")
        static let textSecondary  = Color(hex: "#7a6e72")
        static let textMuted      = Color(hex: "#a89ca0")

        // Semantic
        static let danger         = Color(hex: "#f8a8a8")
        static let success        = Color(hex: "#98d4b4")
        static let accent         = Color(hex: "#d4849c")

        // Feeding
        static let feeding        = Color(hex: "#d4849c")
        static let feedingLight   = Color(hex: "#f8c8dc")
        static let feedingBg      = Color(hex: "#fce4ec")
        static let feedingText    = Color(hex: "#8a3a52")

        // Feeding sub-types
        static let feedingBreast  = Color(hex: "#ec4899")
        static let feedingFormula = Color(hex: "#8b5cf6")
        static let feedingBottle  = Color(hex: "#f59e0b")

        // Diaper
        static let diaper         = Color(hex: "#7ab89c")
        static let diaperLight    = Color(hex: "#c8e6d4")
        static let diaperBg       = Color(hex: "#e8f5e9")
        static let diaperText     = Color(hex: "#2e6b4a")

        // Diaper sub-types
        static let diaperPee      = Color(hex: "#0891b2")
        static let diaperPoo      = Color(hex: "#92400e")

        // Sleep
        static let sleep          = Color(hex: "#6a9cb8")
        static let sleepLight     = Color(hex: "#b8d4e8")
        static let sleepBg        = Color(hex: "#e3f2fd")
        static let sleepText      = Color(hex: "#2a5a78")

        // Pumping
        static let pumping        = Color(hex: "#d4849c")
        static let pumpingLight   = Color(hex: "#f8c8dc")
        static let pumpingBg      = Color(hex: "#fce4ec")
        static let pumpingText    = Color(hex: "#8a3a52")

        // Potty
        static let potty          = Color(hex: "#9878b8")
        static let pottyLight     = Color(hex: "#d8c8e8")
        static let pottyBg        = Color(hex: "#f3e5f5")
        static let pottyText      = Color(hex: "#5a3878")

        // Tummy Time
        static let tummy          = Color(hex: "#c8a848")
        static let tummyLight     = Color(hex: "#f8e8b8")
        static let tummyBg        = Color(hex: "#fffde7")
        static let tummyText      = Color(hex: "#7a6420")

        // Bath
        static let bath           = Color(hex: "#6a9cb8")
        static let bathLight      = Color(hex: "#b8d4e8")
        static let bathBg         = Color(hex: "#e3f2fd")
        static let bathText       = Color(hex: "#2a5a78")

        // Supplement
        static let supplementAction = Color(hex: "#f97316")
    }

    enum Dark {
        // Primary
        static let primary        = Color(hex: "#e8a8c0")
        static let primaryDark    = Color(hex: "#c0708a")
        static let primaryLight   = Color(hex: "#4a3540")

        // Backgrounds & Surfaces
        static let background     = Color(hex: "#1a1614")
        static let surface        = Color(hex: "#201c1a")
        static let surfaceHover   = Color(hex: "#352f2b")

        // Borders
        static let border         = Color(hex: "#3a3230")
        static let borderLight    = Color(hex: "#2a2420")

        // Text
        static let text           = Color(hex: "#f0e8e4")
        static let textSecondary  = Color(hex: "#b8a8a0")
        static let textMuted      = Color(hex: "#887870")

        // Semantic
        static let danger         = Color(hex: "#f8a8a8")
        static let success        = Color(hex: "#88c8a8")
        static let accent         = Color(hex: "#e8a8c0")

        // Feeding
        static let feeding        = Color(hex: "#e8a8c0")
        static let feedingBg      = Color(hex: "#4a3540")
        static let feedingText    = Color(hex: "#e8a8c0")

        // Feeding sub-types
        static let feedingBreast  = Color(hex: "#f472b6")
        static let feedingFormula = Color(hex: "#a78bfa")
        static let feedingBottle  = Color(hex: "#fbbf24")

        // Diaper
        static let diaper         = Color(hex: "#88c8a8")
        static let diaperBg       = Color(hex: "#2d4038")
        static let diaperText     = Color(hex: "#88c8a8")

        // Diaper sub-types
        static let diaperPee      = Color(hex: "#22d3ee")
        static let diaperPoo      = Color(hex: "#d97706")

        // Sleep
        static let sleep          = Color(hex: "#88b8d8")
        static let sleepBg        = Color(hex: "#2d3d4a")
        static let sleepText      = Color(hex: "#88b8d8")

        // Pumping
        static let pumping        = Color(hex: "#e8a8c0")
        static let pumpingBg      = Color(hex: "#4a3540")
        static let pumpingText    = Color(hex: "#e8a8c0")

        // Potty
        static let potty          = Color(hex: "#b898d8")
        static let pottyBg        = Color(hex: "#3d3548")
        static let pottyText      = Color(hex: "#b898d8")

        // Tummy Time
        static let tummy          = Color(hex: "#d8c878")
        static let tummyBg        = Color(hex: "#4a4230")
        static let tummyText      = Color(hex: "#d8c878")

        // Bath
        static let bath           = Color(hex: "#88b8d8")
        static let bathBg         = Color(hex: "#2d3d4a")
        static let bathText       = Color(hex: "#88b8d8")

        // Supplement
        static let supplementAction = Color(hex: "#fb923c")
    }

    // MARK: - Adaptive Helpers

    /// Returns the correct color for the given scheme, falling back to light.
    static func adaptive(light: Color, dark: Color, for scheme: ColorScheme) -> Color {
        scheme == .dark ? dark : light
    }
}
