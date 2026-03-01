import SwiftUI

/// Displays a baby's profile photo or a colored circle with initials as fallback.
///
/// Usage:
/// ```swift
/// BabyAvatar(name: "Luna", photoUrl: baby.profilePhotoUrl)
/// BabyAvatar(name: "Luna", photoUrl: nil, size: 48)
/// ```
struct BabyAvatar: View {
    let name: String
    let photoUrl: String?
    var size: CGFloat = 40

    var body: some View {
        if let photoUrl, let url = URL(string: photoUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure:
                    fallbackView
                case .empty:
                    ProgressView()
                        .frame(width: size, height: size)
                @unknown default:
                    fallbackView
                }
            }
        } else {
            fallbackView
        }
    }

    // MARK: - Fallback

    private var fallbackView: some View {
        Circle()
            .fill(avatarColor)
            .frame(width: size, height: size)
            .overlay(
                Text(initials)
                    .font(.system(size: size * 0.38, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            )
    }

    /// Extract up to two initials from the baby name.
    private var initials: String {
        let parts = name
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .split(separator: " ")
        switch parts.count {
        case 0:
            return "?"
        case 1:
            return String(parts[0].prefix(1)).uppercased()
        default:
            let first = String(parts[0].prefix(1))
            let last = String(parts[parts.count - 1].prefix(1))
            return (first + last).uppercased()
        }
    }

    /// Generate a stable color from the baby name.
    private var avatarColor: Color {
        let colors: [Color] = [
            AppColors.Light.feeding,
            AppColors.Light.diaper,
            AppColors.Light.sleep,
            AppColors.Light.potty,
            AppColors.Light.tummy,
            AppColors.Light.bath,
        ]
        let hash = name.unicodeScalars.reduce(0) { $0 + Int($1.value) }
        return colors[abs(hash) % colors.count]
    }
}

#Preview {
    HStack(spacing: 12) {
        BabyAvatar(name: "Luna Rose", photoUrl: nil)
        BabyAvatar(name: "Max", photoUrl: nil, size: 56)
        BabyAvatar(name: "A B", photoUrl: nil, size: 32)
    }
    .padding()
}
