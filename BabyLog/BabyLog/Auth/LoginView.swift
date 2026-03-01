import SwiftUI

// MARK: - LoginView

struct LoginView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        ZStack {
            // Full-screen background
            theme.background
                .ignoresSafeArea()

            VStack(spacing: Spacing.xxxl) {
                Spacer()

                // MARK: Logo / Title
                logoSection(theme: theme)

                Spacer()

                // MARK: Sign-in Area
                signInSection(theme: theme)

                Spacer()
                    .frame(height: Spacing.xxl)
            }
            .padding(.horizontal, Spacing.xl)
        }
    }

    // MARK: - Logo Section

    @ViewBuilder
    private func logoSection(theme: ResolvedTheme) -> some View {
        VStack(spacing: Spacing.lg) {
            // App icon placeholder — replace with your asset image when available.
            ZStack {
                Circle()
                    .fill(theme.primaryLight.opacity(0.3))
                    .frame(width: 120, height: 120)

                Image(systemName: "heart.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(theme.primary)
            }

            VStack(spacing: Spacing.sm) {
                Text("HeyBub")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundStyle(theme.text)

                Text("Track your baby's moments")
                    .font(.body)
                    .foregroundStyle(theme.textSecondary)
            }
        }
    }

    // MARK: - Sign-in Section

    @ViewBuilder
    private func signInSection(theme: ResolvedTheme) -> some View {
        VStack(spacing: Spacing.lg) {
            // Error message
            if let error = authManager.errorMessage {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(theme.danger)

                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(theme.danger)
                        .multilineTextAlignment(.center)
                }
                .padding(Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: Radii.sm)
                        .fill(theme.danger.opacity(0.1))
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            // Google sign-in button
            Button {
                authManager.signInWithGoogle()
            } label: {
                HStack(spacing: Spacing.md) {
                    if authManager.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        // Google "G" icon approximation using SF Symbols;
                        // replace with a real Google logo asset for production.
                        Image(systemName: "g.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white)
                    }

                    Text("Sign in with Google")
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(
                    RoundedRectangle(cornerRadius: Radii.xl)
                        .fill(theme.primary)
                )
            }
            .disabled(authManager.isLoading)
            .opacity(authManager.isLoading ? 0.7 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: authManager.isLoading)

            // Terms notice
            Text("By signing in you agree to our Terms of Service and Privacy Policy.")
                .font(.caption2)
                .foregroundStyle(theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
        }
    }
}

// MARK: - Preview

#Preview("Login — Light") {
    LoginView()
        .environment(AuthManager())
}

#Preview("Login — Dark") {
    LoginView()
        .environment(AuthManager())
        .preferredColorScheme(.dark)
}
