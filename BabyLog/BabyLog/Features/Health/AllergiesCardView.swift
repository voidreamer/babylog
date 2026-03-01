import SwiftUI

// MARK: - AllergiesCardView

struct AllergiesCardView: View {
    let allergies: [Allergy]
    let viewModel: HealthViewModel
    let babyId: Int

    @State private var showAddForm = false
    @State private var editingAllergy: Allergy?

    var body: some View {
        WidgetCard(title: "Allergies", icon: "allergens", accentColor: .red) {
            VStack(alignment: .leading, spacing: 10) {
                if allergies.isEmpty {
                    HStack {
                        Text("No allergies recorded")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        addButton
                    }
                } else {
                    ForEach(allergies) { allergy in
                        allergyRow(allergy)
                    }

                    addButton
                }
            }
        }
        .sheet(isPresented: $showAddForm) {
            ModalSheet(title: "Add Allergy", onDismiss: { showAddForm = false }) {
                AllergyForm(babyId: babyId) { data in
                    await viewModel.createAllergy(data, babyId: babyId)
                    showAddForm = false
                }
            }
        }
        .sheet(item: $editingAllergy) { allergy in
            ModalSheet(title: "Edit Allergy", onDismiss: { editingAllergy = nil }) {
                AllergyForm(babyId: babyId, existing: allergy) { data in
                    await viewModel.updateAllergy(id: allergy.id, data, babyId: babyId)
                    editingAllergy = nil
                }
            }
        }
    }

    // MARK: - Allergy Row

    private func allergyRow(_ allergy: Allergy) -> some View {
        HStack(alignment: .top, spacing: 10) {
            // Severity indicator
            severityBadge(allergy.severity)

            VStack(alignment: .leading, spacing: 4) {
                Text(allergy.allergen)
                    .font(.subheadline.weight(.medium))

                if let reaction = allergy.reaction, !reaction.isEmpty {
                    Text(reaction)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                if let date = allergy.discoveredDate {
                    Text("Discovered: \(FormatUtils.formatDisplayDate(date))")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            // Action buttons
            HStack(spacing: 8) {
                Button {
                    editingAllergy = allergy
                } label: {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button(role: .destructive) {
                    Task {
                        await viewModel.deleteAllergy(id: allergy.id)
                    }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red.opacity(0.7))
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Severity Badge

    private func severityBadge(_ severity: AllergySeverity?) -> some View {
        let config = severityConfig(severity)
        return Text(config.label)
            .font(.system(size: 9, weight: .bold))
            .foregroundStyle(config.textColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(config.bgColor)
            .clipShape(Capsule())
    }

    private func severityConfig(_ severity: AllergySeverity?) -> (label: String, textColor: Color, bgColor: Color) {
        switch severity {
        case .mild:
            return ("MILD", .green, Color.green.opacity(0.15))
        case .moderate:
            return ("MOD", .orange, Color.orange.opacity(0.15))
        case .severe:
            return ("SEV", .red, Color.red.opacity(0.15))
        case nil:
            return ("N/A", .secondary, Color(.systemGray5))
        }
    }

    // MARK: - Add Button

    private var addButton: some View {
        Button {
            showAddForm = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "plus.circle")
                    .font(.caption)
                Text("Add Allergy")
                    .font(.caption.weight(.medium))
            }
            .foregroundStyle(AppColors.Light.primary)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        AllergiesCardView(
            allergies: [
                Allergy(id: 1, babyId: 1, allergen: "Peanuts", severity: .severe, reaction: "Hives, swelling", discoveredDate: "2025-06-15", notes: nil),
                Allergy(id: 2, babyId: 1, allergen: "Dairy", severity: .mild, reaction: "Mild rash", discoveredDate: "2025-08-01", notes: nil),
                Allergy(id: 3, babyId: 1, allergen: "Dust", severity: .moderate, reaction: "Sneezing, runny nose", discoveredDate: nil, notes: nil),
            ],
            viewModel: HealthViewModel(),
            babyId: 1
        )

        AllergiesCardView(
            allergies: [],
            viewModel: HealthViewModel(),
            babyId: 1
        )
    }
    .padding()
}
