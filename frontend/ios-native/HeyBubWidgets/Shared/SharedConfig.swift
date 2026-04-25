import Foundation

/// Single source of truth for the App Group identifier and Keychain access group.
/// Update both constants if you change the app group in Xcode capabilities.
enum SharedConfig {
    static let appGroup = "group.com.heybub.app.shared"
    /// Must be prefixed by the team's `AppIdentifierPrefix` at runtime — the
    /// actual Keychain `kSecAttrAccessGroup` value is `<prefix>group.com.heybub.app.shared`.
    /// SharedKeychain prepends the prefix automatically.
    static let keychainAccessGroup = "group.com.heybub.app.shared"
}

enum SharedKeys {
    static let accessToken = "babylog.accessToken"
    static let refreshToken = "babylog.refreshToken"
    static let expiresAt = "babylog.expiresAt"
    static let apiBaseUrl = "babylog.apiBaseUrl"
    static let supabaseUrl = "babylog.supabaseUrl"
    static let supabaseAnonKey = "babylog.supabaseAnonKey"
    static let selectedBabyId = "babylog.selectedBabyId"
    static let selectedBabyName = "babylog.selectedBabyName"
    static let pendingActionsFile = "pending_actions.json"
}

enum SharedDefaults {
    static var suite: UserDefaults? {
        UserDefaults(suiteName: SharedConfig.appGroup)
    }
}

enum SharedContainer {
    static var url: URL? {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: SharedConfig.appGroup
        )
    }
}
