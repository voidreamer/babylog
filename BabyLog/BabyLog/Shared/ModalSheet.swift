import SwiftUI

/// A reusable modal sheet wrapper with a title bar and close button.
///
/// Usage:
/// ```swift
/// .sheet(isPresented: $showSheet) {
///     ModalSheet(title: "Add Feeding", onDismiss: { showSheet = false }) {
///         FeedingFormView()
///     }
/// }
/// ```
struct ModalSheet<Content: View>: View {
    let title: String
    let onDismiss: () -> Void
    let content: () -> Content

    init(title: String, onDismiss: @escaping () -> Void, @ViewBuilder content: @escaping () -> Content) {
        self.title = title
        self.onDismiss = onDismiss
        self.content = content
    }

    var body: some View {
        NavigationStack {
            content()
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button {
                            onDismiss()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 20))
                                .symbolRenderingMode(.hierarchical)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
        }
        .presentationDragIndicator(.visible)
    }
}
