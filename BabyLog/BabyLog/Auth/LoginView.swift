import SwiftUI

// MARK: - LoginView

struct LoginView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(\.colorScheme) private var colorScheme

    @State private var logoVisible = false
    @State private var titleVisible = false
    @State private var taglineVisible = false
    @State private var buttonVisible = false
    @State private var termsVisible = false

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        ZStack {
            // Full-screen background
            theme.background
                .ignoresSafeArea()

            // Floating pastel bubbles
            floatingBubbles(theme: theme)

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
        .onAppear {
            animateEntrance()
        }
    }

    // MARK: - Entrance Animation Sequence

    private func animateEntrance() {
        withAnimation(.appGentle.delay(0.1)) { logoVisible = true }
        withAnimation(.appGentle.delay(0.4)) { titleVisible = true }
        withAnimation(.appGentle.delay(0.6)) { taglineVisible = true }
        withAnimation(.appGentle.delay(0.8)) { buttonVisible = true }
        withAnimation(.appGentle.delay(1.0)) { termsVisible = true }
    }

    // MARK: - Floating Bubbles

    @ViewBuilder
    private func floatingBubbles(theme: ResolvedTheme) -> some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height

            // Large bubble top-right
            Circle()
                .fill(theme.primary.opacity(0.06))
                .frame(width: 200, height: 200)
                .offset(x: w * 0.6, y: h * 0.08)
                .floating(amplitude: 8, duration: 3.0)

            // Medium bubble left
            Circle()
                .fill(theme.sleep.main.opacity(0.05))
                .frame(width: 140, height: 140)
                .offset(x: -w * 0.15, y: h * 0.25)
                .floating(amplitude: 6, duration: 3.5)

            // Small bubble bottom-right
            Circle()
                .fill(theme.diaper.main.opacity(0.05))
                .frame(width: 100, height: 100)
                .offset(x: w * 0.7, y: h * 0.7)
                .floating(amplitude: 5, duration: 2.8)

            // Tiny accent bubble
            Circle()
                .fill(theme.tummy.main.opacity(0.06))
                .frame(width: 60, height: 60)
                .offset(x: w * 0.1, y: h * 0.65)
                .floating(amplitude: 4, duration: 3.2)
        }
        .ignoresSafeArea()
    }

    // MARK: - Logo Section

    @ViewBuilder
    private func logoSection(theme: ResolvedTheme) -> some View {
        VStack(spacing: Spacing.lg) {
            // Animated app icon
            ZStack {
                // Outer glow ring
                Circle()
                    .fill(theme.primaryLight.opacity(0.2))
                    .frame(width: 140, height: 140)

                Circle()
                    .fill(theme.primaryLight.opacity(0.3))
                    .frame(width: 120, height: 120)

                Image(systemName: "heart.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(theme.primary)
                    .symbolEffect(.pulse, options: .repeating, value: authManager.isLoading)
            }
            .scaleEffect(logoVisible ? 1.0 : 0.3)
            .opacity(logoVisible ? 1.0 : 0)

            VStack(spacing: Spacing.sm) {
                Text("HeyBub")
                    .font(.appHeading(size: 36, weight: .bold))
                    .foregroundStyle(theme.text)
                    .scaleEffect(titleVisible ? 1.0 : 0.8)
                    .opacity(titleVisible ? 1.0 : 0)

                Text("Track your baby's moments")
                    .font(.appBody(size: 16))
                    .foregroundStyle(theme.textSecondary)
                    .opacity(taglineVisible ? 1.0 : 0)
                    .offset(y: taglineVisible ? 0 : 8)
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
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.danger)
                        .multilineTextAlignment(.center)
                }
                .padding(Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                        .fill(theme.danger.opacity(0.1))
                )
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Google sign-in button
            Button {
                HapticFeedback.medium()
                authManager.signInWithGoogle()
            } label: {
                HStack(spacing: Spacing.md) {
                    if authManager.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "g.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white)
                    }

                    Text("Sign in with Google")
                        .font(.appBody(size: 17, weight: .semibold))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    RoundedRectangle(cornerRadius: Radii.xl, style: .continuous)
                        .fill(theme.primary)
                        .shadow(
                            color: theme.primary.opacity(0.3),
                            radius: 12,
                            y: 6
                        )
                )
            }
            .buttonStyle(.scalePress)
            .disabled(authManager.isLoading)
            .opacity(buttonVisible ? 1.0 : 0)
            .offset(y: buttonVisible ? 0 : 20)
            .animation(.easeInOut(duration: 0.2), value: authManager.isLoading)

            // Terms notice
            Text("By signing in you agree to our Terms of Service and Privacy Policy.")
                .font(.appBody(size: 11))
                .foregroundStyle(theme.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Spacing.lg)
                .opacity(termsVisible ? 1.0 : 0)
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
