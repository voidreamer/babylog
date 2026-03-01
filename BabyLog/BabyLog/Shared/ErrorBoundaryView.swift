import SwiftUI

/// A view that displays an error state with a retry button, wrapping child content.
///
/// When `errorMessage` is non-nil, the error UI is shown instead of `content`.
/// When `errorMessage` is nil, the content is shown normally.
///
/// Usage:
/// ```swift
/// ErrorBoundaryView(errorMessage: viewModel.error) {
///     viewModel.error = nil
///     viewModel.load()
/// } content: {
///     DashboardContent()
/// }
/// ```
struct ErrorBoundaryView<Content: View>: View {
    let errorMessage: String?
    let onRetry: () -> Void
    let content: () -> Content

    init(
        errorMessage: String?,
        onRetry: @escaping () -> Void,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.errorMessage = errorMessage
        self.onRetry = onRetry
        self.content = content
    }

    var body: some View {
        if let errorMessage {
            errorView(message: errorMessage)
        } else {
            content()
        }
    }

    // MARK: - Error View

    @ViewBuilder
    private func errorView(message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)

            VStack(spacing: 6) {
                Text("Something went wrong")
                    .font(.headline)
                    .foregroundStyle(.primary)

                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
            }

            Button(action: onRetry) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppColors.Light.primary)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("Error State") {
    ErrorBoundaryView(errorMessage: "Failed to load activities. Please check your connection.") {
        // retry
    } content: {
        Text("Content would go here")
    }
}

#Preview("Normal State") {
    ErrorBoundaryView(errorMessage: nil) {
        // retry
    } content: {
        Text("Everything is fine!")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
