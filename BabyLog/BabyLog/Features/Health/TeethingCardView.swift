import SwiftUI

// MARK: - Tooth Positions

/// Standard 20 primary teeth positions.
/// Upper jaw: right to left (patient perspective), Lower jaw: left to right.
enum ToothPosition: String, CaseIterable, Identifiable {
    // Upper right (patient's right)
    case upperRightSecondMolar = "upper_right_second_molar"
    case upperRightFirstMolar = "upper_right_first_molar"
    case upperRightCanine = "upper_right_canine"
    case upperRightLateralIncisor = "upper_right_lateral_incisor"
    case upperRightCentralIncisor = "upper_right_central_incisor"

    // Upper left (patient's left)
    case upperLeftCentralIncisor = "upper_left_central_incisor"
    case upperLeftLateralIncisor = "upper_left_lateral_incisor"
    case upperLeftCanine = "upper_left_canine"
    case upperLeftFirstMolar = "upper_left_first_molar"
    case upperLeftSecondMolar = "upper_left_second_molar"

    // Lower left (patient's left)
    case lowerLeftSecondMolar = "lower_left_second_molar"
    case lowerLeftFirstMolar = "lower_left_first_molar"
    case lowerLeftCanine = "lower_left_canine"
    case lowerLeftLateralIncisor = "lower_left_lateral_incisor"
    case lowerLeftCentralIncisor = "lower_left_central_incisor"

    // Lower right (patient's right)
    case lowerRightCentralIncisor = "lower_right_central_incisor"
    case lowerRightLateralIncisor = "lower_right_lateral_incisor"
    case lowerRightCanine = "lower_right_canine"
    case lowerRightFirstMolar = "lower_right_first_molar"
    case lowerRightSecondMolar = "lower_right_second_molar"

    var id: String { rawValue }

    var displayName: String {
        rawValue
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }

    var shortLabel: String {
        switch self {
        case .upperRightSecondMolar, .upperLeftSecondMolar,
             .lowerRightSecondMolar, .lowerLeftSecondMolar:
            return "M2"
        case .upperRightFirstMolar, .upperLeftFirstMolar,
             .lowerRightFirstMolar, .lowerLeftFirstMolar:
            return "M1"
        case .upperRightCanine, .upperLeftCanine,
             .lowerRightCanine, .lowerLeftCanine:
            return "C"
        case .upperRightLateralIncisor, .upperLeftLateralIncisor,
             .lowerRightLateralIncisor, .lowerLeftLateralIncisor:
            return "LI"
        case .upperRightCentralIncisor, .upperLeftCentralIncisor,
             .lowerRightCentralIncisor, .lowerLeftCentralIncisor:
            return "CI"
        }
    }

    static var upperTeeth: [ToothPosition] {
        [
            .upperRightSecondMolar, .upperRightFirstMolar, .upperRightCanine,
            .upperRightLateralIncisor, .upperRightCentralIncisor,
            .upperLeftCentralIncisor, .upperLeftLateralIncisor,
            .upperLeftCanine, .upperLeftFirstMolar, .upperLeftSecondMolar
        ]
    }

    static var lowerTeeth: [ToothPosition] {
        [
            .lowerLeftSecondMolar, .lowerLeftFirstMolar, .lowerLeftCanine,
            .lowerLeftLateralIncisor, .lowerLeftCentralIncisor,
            .lowerRightCentralIncisor, .lowerRightLateralIncisor,
            .lowerRightCanine, .lowerRightFirstMolar, .lowerRightSecondMolar
        ]
    }
}

// MARK: - TeethingCardView

struct TeethingCardView: View {
    let teeth: [Tooth]
    let viewModel: HealthViewModel
    let babyId: Int

    @State private var selectedPosition: ToothPosition?
    @State private var showDatePicker = false
    @State private var emergedDate = Date()

    private var emergedPositions: Set<String> {
        Set(teeth.map(\.position))
    }

    var body: some View {
        WidgetCard(title: "Teething", icon: "mouth", accentColor: .cyan) {
            VStack(spacing: 16) {
                // Count header
                HStack {
                    Text("\(teeth.count) of 20 teeth")
                        .font(.headline)
                    Spacer()
                    if teeth.count > 0 {
                        Text("\(Int((Double(teeth.count) / 20.0) * 100))%")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                }

                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color(.systemGray5))
                            .frame(height: 8)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(
                                LinearGradient(
                                    colors: [.cyan, .mint],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(
                                width: geometry.size.width * CGFloat(teeth.count) / 20.0,
                                height: 8
                            )
                    }
                }
                .frame(height: 8)

                // Upper jaw
                VStack(spacing: 4) {
                    Text("UPPER")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.tertiary)
                        .tracking(1)

                    HStack(spacing: 4) {
                        ForEach(ToothPosition.upperTeeth) { position in
                            toothView(position: position)
                        }
                    }
                }

                // Jaw divider
                Rectangle()
                    .fill(Color(.systemGray4))
                    .frame(height: 1)
                    .padding(.horizontal, 20)

                // Lower jaw
                VStack(spacing: 4) {
                    HStack(spacing: 4) {
                        ForEach(ToothPosition.lowerTeeth) { position in
                            toothView(position: position)
                        }
                    }

                    Text("LOWER")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.tertiary)
                        .tracking(1)
                }

                // Legend
                HStack(spacing: 16) {
                    legendItem(color: .cyan, label: "Emerged")
                    legendItem(color: Color(.systemGray5), label: "Not yet")
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
        }
        .sheet(isPresented: $showDatePicker) {
            toothDatePickerSheet
        }
    }

    // MARK: - Tooth View

    private func toothView(position: ToothPosition) -> some View {
        let isEmerged = emergedPositions.contains(position.rawValue)
        let toothData = teeth.first { $0.position == position.rawValue }

        return Button {
            if isEmerged, let tooth = toothData {
                // Already emerged, tapping deletes
                Task {
                    await viewModel.deleteTooth(id: tooth.id)
                }
            } else {
                // Not emerged, show date picker
                selectedPosition = position
                emergedDate = Date()
                showDatePicker = true
            }
        } label: {
            VStack(spacing: 2) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(isEmerged ? Color.cyan : Color(.systemGray5))
                    .frame(width: 24, height: 28)
                    .overlay(
                        Text(position.shortLabel)
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(isEmerged ? .white : .secondary)
                    )
                    .shadow(
                        color: isEmerged ? .cyan.opacity(0.3) : .clear,
                        radius: 2, x: 0, y: 1
                    )
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Date Picker Sheet

    private var toothDatePickerSheet: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if let position = selectedPosition {
                    Text(position.displayName)
                        .font(.headline)
                        .padding(.top, 8)
                }

                DatePicker(
                    "Emerged Date",
                    selection: $emergedDate,
                    in: ...Date(),
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .padding(.horizontal)

                Button {
                    guard let position = selectedPosition else { return }
                    let data = CreateToothRequest(
                        babyId: babyId,
                        position: position.rawValue,
                        emergedDate: FormatUtils.toDateString(emergedDate)
                    )
                    Task {
                        await viewModel.createTooth(data, babyId: babyId)
                        showDatePicker = false
                    }
                } label: {
                    Text("Save")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.Light.primary)
                .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("Mark Tooth")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showDatePicker = false
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Legend

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 10, height: 10)
            Text(label)
        }
    }
}

// MARK: - Create Tooth Request

private struct CreateToothRequest: Encodable {
    let babyId: Int
    let position: String
    let emergedDate: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case position
        case emergedDate = "emerged_date"
    }
}

// MARK: - Preview

#Preview {
    TeethingCardView(
        teeth: [
            Tooth(id: 1, babyId: 1, position: "lower_left_central_incisor", emergedDate: "2025-06-01"),
            Tooth(id: 2, babyId: 1, position: "lower_right_central_incisor", emergedDate: "2025-06-15"),
            Tooth(id: 3, babyId: 1, position: "upper_left_central_incisor", emergedDate: "2025-07-01"),
            Tooth(id: 4, babyId: 1, position: "upper_right_central_incisor", emergedDate: "2025-07-10"),
        ],
        viewModel: HealthViewModel(),
        babyId: 1
    )
    .padding()
}
