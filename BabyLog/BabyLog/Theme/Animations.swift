import SwiftUI

// MARK: - Spring Presets

extension Animation {
    /// Snappy spring for button presses and quick interactions.
    static let appSnappy = Animation.spring(response: 0.3, dampingFraction: 0.7)
    /// Gentle spring for cards and content entrance.
    static let appGentle = Animation.spring(response: 0.5, dampingFraction: 0.8)
    /// Bouncy spring for playful elements.
    static let appBouncy = Animation.spring(response: 0.4, dampingFraction: 0.6)
}

// MARK: - Staggered Appear Modifier

/// Cascading opacity + slide animation for items in a list.
/// Assign incrementing `index` values (0, 1, 2, …) and all items animate
/// in a staggered cascade with a configurable per-item delay.
///
/// Usage:
/// ```swift
/// ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
///     ItemView(item)
///         .staggeredAppear(index: i)
/// }
/// ```
struct StaggeredAppearModifier: ViewModifier {
    let index: Int
    let delay: Double
    @State private var isVisible = false

    func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1 : 0)
            .offset(y: isVisible ? 0 : 12)
            .onAppear {
                withAnimation(.appGentle.delay(Double(index) * delay)) {
                    isVisible = true
                }
            }
    }
}

extension View {
    /// Animate appearance with staggered delay based on index.
    func staggeredAppear(index: Int, delay: Double = 0.05) -> some View {
        modifier(StaggeredAppearModifier(index: index, delay: delay))
    }
}

// MARK: - Scale Press Button Style

/// Button style that scales down and dims slightly on press, then springs back.
struct ScalePressButtonStyle: ButtonStyle {
    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(.appSnappy, value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == ScalePressButtonStyle {
    static var scalePress: ScalePressButtonStyle { ScalePressButtonStyle() }
}

// MARK: - Shimmer Loading Modifier

/// Gradient sweep animation for skeleton placeholder views.
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [
                            .clear,
                            Color.white.opacity(0.4),
                            .clear,
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.6)
                    .offset(x: phase * geo.size.width)
                    .onAppear {
                        withAnimation(
                            .linear(duration: 1.5)
                            .repeatForever(autoreverses: false)
                        ) {
                            phase = 1.5
                        }
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

extension View {
    /// Apply a shimmer sweep animation (for skeleton loading).
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// MARK: - Bounce In Modifier

/// Scale from small + fade in with a bouncy spring.
struct BounceInModifier: ViewModifier {
    @State private var isVisible = false
    var delay: Double = 0

    func body(content: Content) -> some View {
        content
            .scaleEffect(isVisible ? 1 : 0.6)
            .opacity(isVisible ? 1 : 0)
            .onAppear {
                withAnimation(.appBouncy.delay(delay)) {
                    isVisible = true
                }
            }
    }
}

extension View {
    /// Bounce in with scale + fade.
    func bounceIn(delay: Double = 0) -> some View {
        modifier(BounceInModifier(delay: delay))
    }
}

// MARK: - Slide Transition Helpers

extension AnyTransition {
    /// Slide up from below + fade.
    static var slideUp: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .bottom).combined(with: .opacity),
            removal: .move(edge: .bottom).combined(with: .opacity)
        )
    }

    /// Slide in from right + fade.
    static var slideFromRight: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .trailing).combined(with: .opacity)
        )
    }

    /// Scale + fade for modal-like presentations.
    static var scaleAndFade: AnyTransition {
        .asymmetric(
            insertion: .scale(scale: 0.9).combined(with: .opacity),
            removal: .scale(scale: 0.95).combined(with: .opacity)
        )
    }
}

// MARK: - Animated Progress

/// Animates a value from 0 to its target on appear — useful for progress bars.
struct AnimatedProgressModifier: ViewModifier {
    let targetProgress: Double
    @State private var currentProgress: Double = 0

    func body(content: Content) -> some View {
        content
            .onAppear {
                withAnimation(.appGentle.delay(0.2)) {
                    currentProgress = targetProgress
                }
            }
            .onChange(of: targetProgress) { _, newValue in
                withAnimation(.appGentle) {
                    currentProgress = newValue
                }
            }
            .environment(\.animatedProgress, currentProgress)
    }
}

/// Environment key so child views can read the animated progress value.
private struct AnimatedProgressKey: EnvironmentKey {
    static let defaultValue: Double = 0
}

extension EnvironmentValues {
    var animatedProgress: Double {
        get { self[AnimatedProgressKey.self] }
        set { self[AnimatedProgressKey.self] = newValue }
    }
}

extension View {
    /// Wrap with animated progress value (0 → target on appear).
    func animatedProgress(_ target: Double) -> some View {
        modifier(AnimatedProgressModifier(targetProgress: target))
    }
}

// MARK: - Celebration Burst

/// A short-lived particle burst for successful saves.
struct CelebrationBurst: View {
    @State private var particles: [(id: Int, offset: CGSize, opacity: Double)] = []
    @State private var isAnimating = false

    private let colors: [Color] = [
        Color(hex: "#d4849c"), Color(hex: "#7ab89c"), Color(hex: "#6a9cb8"),
        Color(hex: "#c8a848"), Color(hex: "#9878b8"), Color(hex: "#f59e0b"),
    ]

    var body: some View {
        ZStack {
            ForEach(particles, id: \.id) { particle in
                Circle()
                    .fill(colors[particle.id % colors.count])
                    .frame(width: CGFloat.random(in: 4...8), height: CGFloat.random(in: 4...8))
                    .offset(particle.offset)
                    .opacity(particle.opacity)
            }
        }
        .onAppear {
            burst()
        }
    }

    private func burst() {
        particles = (0..<12).map { i in
            (id: i, offset: .zero, opacity: 1.0)
        }

        withAnimation(.easeOut(duration: 0.6)) {
            particles = particles.map { p in
                let angle = Double(p.id) * (2 * .pi / 12)
                let distance: CGFloat = CGFloat.random(in: 30...60)
                return (
                    id: p.id,
                    offset: CGSize(
                        width: cos(angle) * distance,
                        height: sin(angle) * distance
                    ),
                    opacity: 0
                )
            }
        }
    }
}

// MARK: - Floating Animation Modifier

/// Gentle up-down floating animation — used for empty state illustrations.
struct FloatingModifier: ViewModifier {
    @State private var isFloating = false
    let amplitude: CGFloat
    let duration: Double

    init(amplitude: CGFloat = 6, duration: Double = 2.5) {
        self.amplitude = amplitude
        self.duration = duration
    }

    func body(content: Content) -> some View {
        content
            .offset(y: isFloating ? -amplitude : amplitude)
            .animation(
                .easeInOut(duration: duration).repeatForever(autoreverses: true),
                value: isFloating
            )
            .onAppear { isFloating = true }
    }
}

extension View {
    /// Gentle floating up/down animation.
    func floating(amplitude: CGFloat = 6, duration: Double = 2.5) -> some View {
        modifier(FloatingModifier(amplitude: amplitude, duration: duration))
    }
}

