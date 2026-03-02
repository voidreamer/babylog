import SwiftUI

// MARK: - Activity Pill Picker

/// A horizontal row of pill buttons for selecting activity sub-types.
/// Replaces stock `Picker(.segmented)` with a colored, animated pill selector.
struct ActivityPillPicker<T: Hashable>: View {
    let options: [(value: T, label: String, icon: String?)]
    @Binding var selection: T
    let colorSet: ActivityColorSet

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                ForEach(Array(options.enumerated()), id: \.offset) { _, option in
                    let isSelected = option.value == selection

                    Button {
                        HapticFeedback.selection()
                        withAnimation(.appSnappy) {
                            selection = option.value
                        }
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            if let icon = option.icon {
                                Image(systemName: icon)
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            Text(option.label)
                                .font(.appBody(size: 14, weight: .semibold))
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.sm)
                        .foregroundStyle(isSelected ? .white : colorSet.text)
                        .background(
                            Capsule()
                                .fill(isSelected ? colorSet.main : colorSet.bg)
                        )
                    }
                    .buttonStyle(.scalePress)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Quantity Stepper

/// A custom +/- stepper with a large center number and haptic feedback.
struct QuantityStepper: View {
    let label: String
    let unit: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    let accentColor: Color

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        HStack(spacing: Spacing.lg) {
            // Minus button
            Button {
                HapticFeedback.light()
                withAnimation(.appSnappy) {
                    value = max(range.lowerBound, value - step)
                }
            } label: {
                Image(systemName: "minus")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(value <= range.lowerBound ? theme.textMuted : accentColor)
                    .frame(width: 40, height: 40)
                    .background(
                        Circle()
                            .fill(accentColor.opacity(0.1))
                    )
            }
            .buttonStyle(.scalePress)
            .disabled(value <= range.lowerBound)

            // Center value
            VStack(spacing: 2) {
                Text("\(Int(value))")
                    .font(.appHeading(size: 28, weight: .bold))
                    .foregroundStyle(theme.text)
                    .contentTransition(.numericText())
                    .monospacedDigit()

                Text(unit)
                    .font(.appBody(size: 12, weight: .medium))
                    .foregroundStyle(theme.textMuted)
            }
            .frame(minWidth: 60)

            // Plus button
            Button {
                HapticFeedback.light()
                withAnimation(.appSnappy) {
                    value = min(range.upperBound, value + step)
                }
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(value >= range.upperBound ? theme.textMuted : accentColor)
                    .frame(width: 40, height: 40)
                    .background(
                        Circle()
                            .fill(accentColor.opacity(0.1))
                    )
            }
            .buttonStyle(.scalePress)
            .disabled(value >= range.upperBound)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Form Save Button

/// A full-width, activity-colored save button with loading and success states.
struct FormSaveButton: View {
    let label: String
    let accentColor: Color
    let isLoading: Bool
    let action: () -> Void

    @State private var showSuccess = false

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Button {
            HapticFeedback.medium()
            action()
        } label: {
            HStack(spacing: Spacing.sm) {
                if showSuccess {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .transition(.scale.combined(with: .opacity))
                } else if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(label)
                        .font(.appBody(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                    .fill(accentColor)
            )
        }
        .buttonStyle(.scalePress)
        .disabled(isLoading || showSuccess)
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
    }
}
