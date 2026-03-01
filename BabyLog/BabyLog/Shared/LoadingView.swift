import SwiftUI

/// A centered loading indicator with an optional message.
///
/// Usage:
/// ```swift
/// LoadingView()
/// LoadingView(message: "Loading activities...")
/// ```
struct LoadingView: View {
    var message: String?

    var body: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.regular)
            if let message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("Default") {
    LoadingView()
}

#Preview("With Message") {
    LoadingView(message: "Loading activities...")
}
