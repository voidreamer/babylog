import Foundation

// MARK: - AuthTokens

/// Typed container for the OAuth tokens extracted from a callback URL.
struct AuthTokens: Sendable {
    let accessToken: String
    let refreshToken: String
    /// Number of seconds until the access token expires (from the OAuth provider).
    let expiresIn: TimeInterval
    /// The wall-clock date at which the access token expires, computed at parse time.
    let expiresAt: Date
}

// MARK: - CallbackHandler

/// Parses an OAuth callback URL of the form:
///
///     heybub://callback#access_token=...&refresh_token=...&expires_in=3600&token_type=bearer
///
/// The fragment is treated as a query string; if no fragment is present the
/// handler falls back to the URL's query parameters (some providers use `?`
/// instead of `#`).
enum CallbackHandler {

    /// Possible errors when parsing a callback URL.
    enum CallbackError: LocalizedError, Sendable {
        case invalidURL
        case missingAccessToken
        case missingRefreshToken
        case missingExpiresIn

        var errorDescription: String? {
            switch self {
            case .invalidURL:           return "The callback URL could not be parsed."
            case .missingAccessToken:   return "The callback URL is missing an access token."
            case .missingRefreshToken:  return "The callback URL is missing a refresh token."
            case .missingExpiresIn:     return "The callback URL is missing the expires_in field."
            }
        }
    }

    // MARK: - Public API

    /// Parse an OAuth callback URL and return strongly-typed tokens.
    ///
    /// - Parameter url: The deep-link URL received by the app (e.g. via `.onOpenURL`).
    /// - Throws: `CallbackError` if any required parameter is absent or malformed.
    /// - Returns: An `AuthTokens` value with all extracted fields.
    static func parse(_ url: URL) throws -> AuthTokens {
        let params = extractParameters(from: url)

        guard let accessToken = params["access_token"], !accessToken.isEmpty else {
            throw CallbackError.missingAccessToken
        }
        guard let refreshToken = params["refresh_token"], !refreshToken.isEmpty else {
            throw CallbackError.missingRefreshToken
        }
        guard let expiresInString = params["expires_in"],
              let expiresIn = TimeInterval(expiresInString) else {
            throw CallbackError.missingExpiresIn
        }

        return AuthTokens(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: expiresIn,
            expiresAt: Date().addingTimeInterval(expiresIn)
        )
    }

    /// A non-throwing convenience that returns `nil` on failure.
    static func parseOrNil(_ url: URL) -> AuthTokens? {
        try? parse(url)
    }

    // MARK: - Helpers

    /// Extract key-value parameters from either the URL fragment or the query string.
    private static func extractParameters(from url: URL) -> [String: String] {
        // Prefer fragment (#access_token=...); fall back to query (?access_token=...).
        let raw = url.fragment ?? url.query ?? ""
        return parseQueryString(raw)
    }

    /// Splits a `key=value&key=value` string into a dictionary, percent-decoding values.
    private static func parseQueryString(_ string: String) -> [String: String] {
        var result: [String: String] = [:]
        let pairs = string.split(separator: "&", omittingEmptySubsequences: true)
        for pair in pairs {
            let parts = pair.split(separator: "=", maxSplits: 1)
            guard parts.count == 2 else { continue }
            let key = String(parts[0])
            let value = String(parts[1]).removingPercentEncoding ?? String(parts[1])
            result[key] = value
        }
        return result
    }
}
