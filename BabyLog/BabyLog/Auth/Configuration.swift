import Foundation

// MARK: - Auth Configuration

/// Centralised configuration for Supabase and API credentials.
/// Values are resolved in priority order:
///   1. Bundle Info.plist keys (set via xcconfig / build settings)
///   2. Process environment variables (Xcode scheme overrides / tests)
///   3. Empty string (caller must guard)
enum Configuration {

    static var supabaseURL: String {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String
            ?? ProcessInfo.processInfo.environment["SUPABASE_URL"]
            ?? ""
    }

    static var supabaseAnonKey: String {
        Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String
            ?? ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"]
            ?? ""
    }

    static var apiBaseURL: String {
        Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
            ?? ProcessInfo.processInfo.environment["API_BASE_URL"]
            ?? ""
    }
}

/// Legacy alias used by AuthManager — points to the same enum.
typealias AuthConfiguration = Configuration
