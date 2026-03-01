import SwiftUI

// MARK: - Color Scheme Preference

/// The user's theme preference, persisted in `UserDefaults` under key `"theme"`.
/// Maps to the same string values used by the web app's localStorage.
enum AppColorScheme: String, CaseIterable, Identifiable {
    /// Follow the device's system appearance.
    case system
    /// Always light.
    case light
    /// Always dark.
    case dark

    var id: String { rawValue }

    /// Human-readable label for settings UI.
    var displayName: String {
        switch self {
        case .system:  return String(localized: "System", comment: "Theme option: follow device setting")
        case .light:   return String(localized: "Light", comment: "Theme option: always light")
        case .dark:    return String(localized: "Dark", comment: "Theme option: always dark")
        }
    }

    /// The SF Symbol name for a picker icon.
    var iconName: String {
        switch self {
        case .system:  return "circle.lefthalf.filled"
        case .light:   return "sun.max.fill"
        case .dark:    return "moon.fill"
        }
    }

    /// Convert to SwiftUI's optional `ColorScheme`.
    /// Returns `nil` for `.system` so the app inherits the device setting.
    var colorScheme: ColorScheme? {
        switch self {
        case .system:  return nil
        case .light:   return .light
        case .dark:    return .dark
        }
    }
}

// MARK: - Theme Manager

/// Observable singleton that owns the user's theme preference.
///
/// Inject into the environment at the app root:
/// ```swift
/// @State private var themeManager = ThemeManager()
///
/// var body: some Scene {
///     WindowGroup {
///         ContentView()
///             .environment(themeManager)
///             .preferredColorScheme(themeManager.preferredColorScheme)
///     }
/// }
/// ```
///
/// Read from any child view:
/// ```swift
/// @Environment(ThemeManager.self) private var themeManager
/// ```
@Observable
final class ThemeManager {

    // MARK: - Constants

    private static let userDefaultsKey = "theme"

    // MARK: - Published State

    /// The user's explicit preference. Changing this persists immediately.
    var colorScheme: AppColorScheme {
        didSet {
            guard colorScheme != oldValue else { return }
            persist(colorScheme)
        }
    }

    // MARK: - Init

    init() {
        if let stored = UserDefaults.standard.string(forKey: Self.userDefaultsKey),
           let scheme = AppColorScheme(rawValue: stored) {
            self.colorScheme = scheme
        } else {
            self.colorScheme = .system
        }
    }

    // MARK: - Computed

    /// The `ColorScheme?` to pass to `.preferredColorScheme(_:)`.
    /// `nil` means "follow system".
    var preferredColorScheme: ColorScheme? {
        colorScheme.colorScheme
    }

    /// Resolve the effective `ResolvedTheme` given the actual device color scheme.
    /// Pass in `@Environment(\.colorScheme)` so that `.system` resolves correctly.
    func resolvedTheme(for deviceScheme: ColorScheme) -> ResolvedTheme {
        let effective = colorScheme.colorScheme ?? deviceScheme
        return AppTheme.resolved(for: effective)
    }

    // MARK: - Cycle

    /// Advance to the next theme option (system -> light -> dark -> system).
    func cycleTheme() {
        let all = AppColorScheme.allCases
        guard let idx = all.firstIndex(of: colorScheme) else { return }
        let next = all[(idx + 1) % all.count]
        colorScheme = next
    }

    // MARK: - Private

    private func persist(_ scheme: AppColorScheme) {
        UserDefaults.standard.set(scheme.rawValue, forKey: Self.userDefaultsKey)
    }
}
