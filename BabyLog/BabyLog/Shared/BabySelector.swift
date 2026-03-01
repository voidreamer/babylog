import SwiftUI

/// A horizontal scrollable baby selector showing `BabyAvatar` for each baby.
/// Tapping an avatar selects that baby.
///
/// Usage:
/// ```swift
/// BabySelector(babies: babies, selectedBabyId: $selectedBabyId)
/// ```
struct BabySelector: View {
    let babies: [Baby]
    @Binding var selectedBabyId: Int?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(babies) { baby in
                    BabySelectorItem(
                        baby: baby,
                        isSelected: selectedBabyId == baby.id
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedBabyId = baby.id
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }
}

// MARK: - Selector Item

private struct BabySelectorItem: View {
    let baby: Baby
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(spacing: 6) {
            BabyAvatar(
                name: baby.name,
                photoUrl: baby.profilePhotoUrl,
                size: 48
            )
            .overlay(
                Circle()
                    .strokeBorder(
                        isSelected ? AppColors.Light.primary : Color.clear,
                        lineWidth: 2.5
                    )
                    .frame(width: 52, height: 52)
            )

            Text(baby.name)
                .font(.system(size: 12, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .primary : .secondary)
                .lineLimit(1)
        }
        .frame(minWidth: 60)
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
        .accessibilityLabel("Select \(baby.name)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

#Preview {
    struct PreviewWrapper: View {
        @State private var selectedId: Int? = 1
        let babies: [Baby] = [
            Baby(id: 1, name: "Luna", birthDate: nil, gender: nil, profilePhotoUrl: nil, bloodType: nil, birthplace: nil, birthTime: nil, isOwner: true, sharedWith: nil, createdAt: nil),
            Baby(id: 2, name: "Max", birthDate: nil, gender: nil, profilePhotoUrl: nil, bloodType: nil, birthplace: nil, birthTime: nil, isOwner: true, sharedWith: nil, createdAt: nil),
            Baby(id: 3, name: "Sofia Rose", birthDate: nil, gender: nil, profilePhotoUrl: nil, bloodType: nil, birthplace: nil, birthTime: nil, isOwner: false, sharedWith: nil, createdAt: nil),
        ]
        var body: some View {
            BabySelector(babies: babies, selectedBabyId: $selectedId)
        }
    }
    return PreviewWrapper()
}
