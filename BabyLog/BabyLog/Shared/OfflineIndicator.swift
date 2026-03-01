import SwiftUI

/// A small banner capsule that appears when the device is offline.
///
/// Usage:
/// ```swift
/// OfflineIndicator(isOffline: !networkMonitor.isConnected)
/// ```
struct OfflineIndicator: View {
    let isOffline: Bool

    var body: some View {
        if isOffline {
            HStack(spacing: 6) {
                Image(systemName: "cloud.slash")
                    .font(.system(size: 12, weight: .semibold))
                Text("You're offline")
                    .font(.system(size: 12, weight: .semibold))
            }
            .foregroundStyle(Color.orange)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color.orange.opacity(0.12))
            )
            .overlay(
                Capsule()
                    .strokeBorder(Color.orange.opacity(0.25), lineWidth: 1)
            )
            .transition(.move(edge: .top).combined(with: .opacity))
            .animation(.easeInOut(duration: 0.3), value: isOffline)
        }
    }
}

#Preview {
    VStack {
        OfflineIndicator(isOffline: true)
        Spacer()
    }
    .padding()
}
