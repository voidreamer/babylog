import Foundation
import AuthenticationServices
import Observation

// MARK: - Token Storage Keys

private enum TokenKey {
    static let accessToken  = "access_token"
    static let refreshToken = "refresh_token"
    static let expiresAt    = "expires_at" // stored as TimeInterval since 1970
    static let userId       = "user_id"
    static let userEmail    = "user_email"
}

// MARK: - AuthManager

@Observable
@MainActor
final class AuthManager {

    // MARK: Published State

    /// Whether the user has a valid (or refreshable) session.
    var isAuthenticated = false

    /// The currently signed-in user, or `nil` when signed out.
    var currentUser: AppUser?

    /// `true` while any async auth operation is in flight.
    var isLoading = false

    /// The last error message from an auth operation, cleared on next attempt.
    var errorMessage: String?

    // MARK: Computed — Access Token

    /// Returns a live access token, refreshing transparently if expired.
    /// Intended to be called from the `APIClient.tokenProvider` closure.
    var currentAccessToken: String? {
        get async {
            // If the token is still valid, return it immediately.
            if let token = KeychainHelper.loadString(key: TokenKey.accessToken),
               !isTokenExpired {
                return token
            }
            // Attempt a refresh.
            do {
                try await refreshToken()
                return KeychainHelper.loadString(key: TokenKey.accessToken)
            } catch {
                // Refresh failed — treat as signed out.
                await signOut()
                return nil
            }
        }
    }

    // MARK: - Session Restore

    /// Called once at app launch to check for persisted tokens and
    /// silently refresh if necessary.
    func restoreSession() async {
        guard let refreshTokenValue = KeychainHelper.loadString(key: TokenKey.refreshToken),
              !refreshTokenValue.isEmpty else {
            isAuthenticated = false
            currentUser = nil
            return
        }

        isLoading = true
        defer { isLoading = false }

        // If the access token is still fresh we can restore immediately.
        if let accessToken = KeychainHelper.loadString(key: TokenKey.accessToken),
           !accessToken.isEmpty,
           !isTokenExpired {
            restoreUserFromKeychain()
            isAuthenticated = true
            return
        }

        // Otherwise try to refresh.
        do {
            try await refreshToken()
            restoreUserFromKeychain()
            isAuthenticated = true
        } catch {
            // Tokens are stale/invalid — force re-login.
            clearTokens()
            isAuthenticated = false
            currentUser = nil
        }
    }

    // MARK: - Google Sign In (ASWebAuthenticationSession)

    /// Opens the Supabase Google OAuth consent screen in an in-app browser
    /// session and waits for the `heybub://callback` redirect.
    func signInWithGoogle() {
        let supabaseURL = AuthConfiguration.supabaseURL
        guard !supabaseURL.isEmpty else {
            errorMessage = "Supabase URL is not configured."
            return
        }

        let redirectURI = "heybub://callback"
        let urlString = "\(supabaseURL)/auth/v1/authorize"
            + "?provider=google"
            + "&redirect_to=\(redirectURI)"

        guard let authURL = URL(string: urlString) else {
            errorMessage = "Could not build the authentication URL."
            return
        }

        isLoading = true
        errorMessage = nil

        // ASWebAuthenticationSession needs a presentation anchor.
        // We grab the first key window scene.
        let contextProvider = WebAuthContextProvider()

        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: "heybub"
        ) { [weak self] callbackURL, error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.isLoading = false

                if let error {
                    // User cancelled is not a real error.
                    if (error as NSError).code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        return
                    }
                    self.errorMessage = error.localizedDescription
                    return
                }

                guard let callbackURL else {
                    self.errorMessage = "No callback URL received."
                    return
                }

                self.handleDeepLink(callbackURL)
            }
        }

        session.presentationContextProvider = contextProvider
        session.prefersEphemeralWebBrowserSession = false

        // Hold a strong reference so ARC doesn't dealloc the session.
        currentWebAuthSession = session
        currentContextProvider = contextProvider
        session.start()
    }

    // MARK: - Deep Link Handler

    /// Parses an incoming `heybub://callback#access_token=...` URL,
    /// persists the tokens, and marks the user as authenticated.
    func handleDeepLink(_ url: URL) {
        guard url.scheme == "heybub", url.host == "callback" else { return }

        do {
            let tokens = try CallbackHandler.parse(url)
            persistTokens(tokens)
            decodeAndSetUser(from: tokens.accessToken)
            isAuthenticated = true
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            isAuthenticated = false
        }
    }

    // MARK: - Sign Out

    /// Clears all local auth state and tokens.
    @MainActor
    func signOut() {
        clearTokens()
        currentUser = nil
        isAuthenticated = false
        errorMessage = nil
    }

    // MARK: - Token Refresh

    /// Exchanges the stored refresh token for a fresh access token via
    /// the Supabase `/auth/v1/token?grant_type=refresh_token` endpoint.
    func refreshToken() async throws {
        let supabaseURL = AuthConfiguration.supabaseURL
        let anonKey = AuthConfiguration.supabaseAnonKey

        guard let refreshTokenValue = KeychainHelper.loadString(key: TokenKey.refreshToken),
              !refreshTokenValue.isEmpty else {
            throw AuthError.noRefreshToken
        }

        guard let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=refresh_token") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")

        let body: [String: String] = ["refresh_token": refreshTokenValue]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw AuthError.unexpectedResponse
        }

        guard (200...299).contains(http.statusCode) else {
            throw AuthError.refreshFailed(statusCode: http.statusCode)
        }

        let decoded = try JSONDecoder().decode(TokenRefreshResponse.self, from: data)

        let tokens = AuthTokens(
            accessToken: decoded.accessToken,
            refreshToken: decoded.refreshToken,
            expiresIn: decoded.expiresIn,
            expiresAt: Date().addingTimeInterval(decoded.expiresIn)
        )

        persistTokens(tokens)
        decodeAndSetUser(from: tokens.accessToken)
    }

    // MARK: - Delete Account

    /// Calls the backend `DELETE /api/users/me` endpoint and then signs out.
    func deleteAccount() async throws {
        guard let token = await currentAccessToken else {
            throw AuthError.noAccessToken
        }

        let apiBaseURL = AuthConfiguration.apiBaseURL.isEmpty
            ? Configuration.apiBaseURL
            : AuthConfiguration.apiBaseURL

        guard let url = URL(string: "\(apiBaseURL)/api/users/me") else {
            throw AuthError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse,
              (200...299).contains(http.statusCode) else {
            throw AuthError.deleteFailed
        }

        signOut()
    }

    // MARK: - Private Helpers

    /// Strong references kept alive during the web auth session.
    private var currentWebAuthSession: ASWebAuthenticationSession?
    private var currentContextProvider: WebAuthContextProvider?

    /// Whether the persisted access token has passed its expiry.
    private var isTokenExpired: Bool {
        guard let expiresAtString = KeychainHelper.loadString(key: TokenKey.expiresAt),
              let expiresAtInterval = TimeInterval(expiresAtString) else {
            return true
        }
        // Consider expired 60 seconds early to avoid race conditions.
        return Date().timeIntervalSince1970 >= (expiresAtInterval - 60)
    }

    /// Save tokens into the Keychain stub.
    private func persistTokens(_ tokens: AuthTokens) {
        KeychainHelper.save(tokens.accessToken, for: TokenKey.accessToken)
        KeychainHelper.save(tokens.refreshToken, for: TokenKey.refreshToken)
        KeychainHelper.save(
            String(tokens.expiresAt.timeIntervalSince1970),
            for: TokenKey.expiresAt
        )
    }

    /// Remove all auth-related persisted data.
    private func clearTokens() {
        KeychainHelper.delete( TokenKey.accessToken)
        KeychainHelper.delete( TokenKey.refreshToken)
        KeychainHelper.delete( TokenKey.expiresAt)
        KeychainHelper.delete( TokenKey.userId)
        KeychainHelper.delete( TokenKey.userEmail)
    }

    /// Decode the JWT payload (base64url, no signature verification) to
    /// extract `sub` (user id) and `email`.
    private func decodeAndSetUser(from jwt: String) {
        guard let payload = decodeJWTPayload(jwt),
              let sub = payload["sub"] as? String else {
            return
        }
        let email = payload["email"] as? String ?? ""
        currentUser = AppUser(id: sub, email: email)
        KeychainHelper.save(sub, for: TokenKey.userId)
        KeychainHelper.save(email, for: TokenKey.userEmail)
    }

    /// Restore the cached user without hitting the network.
    private func restoreUserFromKeychain() {
        if let id = KeychainHelper.loadString(key: TokenKey.userId) {
            let email = KeychainHelper.loadString(key: TokenKey.userEmail) ?? ""
            currentUser = AppUser(id: id, email: email)
        }
    }

    /// Minimal JWT base64url decoder (header.payload.signature).
    private func decodeJWTPayload(_ jwt: String) -> [String: Any]? {
        let segments = jwt.split(separator: ".")
        guard segments.count == 3 else { return nil }

        var base64 = String(segments[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Pad to a multiple of 4.
        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(contentsOf: String(repeating: "=", count: 4 - remainder))
        }

        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return json
    }
}

// MARK: - Token Refresh Response

/// The JSON shape returned by Supabase `/auth/v1/token?grant_type=refresh_token`.
private struct TokenRefreshResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: TimeInterval

    enum CodingKeys: String, CodingKey {
        case accessToken  = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn    = "expires_in"
    }
}

// MARK: - AuthError

enum AuthError: LocalizedError, Sendable {
    case noRefreshToken
    case noAccessToken
    case invalidURL
    case unexpectedResponse
    case refreshFailed(statusCode: Int)
    case deleteFailed

    var errorDescription: String? {
        switch self {
        case .noRefreshToken:
            return "No refresh token available. Please sign in again."
        case .noAccessToken:
            return "No access token available. Please sign in again."
        case .invalidURL:
            return "Could not construct the authentication URL."
        case .unexpectedResponse:
            return "Received an unexpected response from the server."
        case .refreshFailed(let code):
            return "Token refresh failed (HTTP \(code)). Please sign in again."
        case .deleteFailed:
            return "Account deletion failed. Please try again."
        }
    }
}

// MARK: - ASWebAuthenticationSession Presentation Context

/// Provides the presentation anchor (key window) for ASWebAuthenticationSession.
private final class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive }),
              let window = scene.windows.first(where: { $0.isKeyWindow }) else {
            // Fallback — create a bare window; this should never happen in practice.
            return ASPresentationAnchor()
        }
        return window
    }
}
