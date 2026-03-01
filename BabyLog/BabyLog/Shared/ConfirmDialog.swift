import SwiftUI

/// A view modifier that presents a destructive-action confirmation alert.
///
/// Usage:
/// ```swift
/// Button("Delete") { showConfirm = true }
///     .confirmDialog(
///         isPresented: $showConfirm,
///         title: "Delete Entry",
///         message: "Are you sure? This cannot be undone.",
///         confirmLabel: "Delete",
///         onConfirm: { viewModel.delete() }
///     )
/// ```
struct ConfirmDialogModifier: ViewModifier {
    @Binding var isPresented: Bool
    let title: String
    var message: String?
    var confirmLabel: String = "Confirm"
    var cancelLabel: String = "Cancel"
    let onConfirm: () -> Void

    func body(content: Content) -> some View {
        content
            .alert(title, isPresented: $isPresented) {
                Button(cancelLabel, role: .cancel) { }
                Button(confirmLabel, role: .destructive) {
                    onConfirm()
                }
            } message: {
                if let message {
                    Text(message)
                }
            }
    }
}

extension View {
    /// Attaches a destructive-action confirmation dialog.
    func confirmDialog(
        isPresented: Binding<Bool>,
        title: String,
        message: String? = nil,
        confirmLabel: String = "Confirm",
        cancelLabel: String = "Cancel",
        onConfirm: @escaping () -> Void
    ) -> some View {
        modifier(
            ConfirmDialogModifier(
                isPresented: isPresented,
                title: title,
                message: message,
                confirmLabel: confirmLabel,
                cancelLabel: cancelLabel,
                onConfirm: onConfirm
            )
        )
    }
}
