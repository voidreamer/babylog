import SwiftUI

// MARK: - MedicationQuickLogView

struct MedicationQuickLogView: View {
    let medications: [Medication]
    let viewModel: HealthViewModel
    let babyId: Int
    let onAdd: () -> Void

    @State private var editingMedication: Medication?
    @State private var showInactive = false

    private var activeMedications: [Medication] {
        medications.filter { $0.isActive }
    }

    private var inactiveMedications: [Medication] {
        medications.filter { !$0.isActive }
    }

    var body: some View {
        WidgetCard(title: "Medications", icon: "pills", accentColor: .teal) {
            VStack(alignment: .leading, spacing: 12) {
                if medications.isEmpty {
                    HStack {
                        Text("No medications recorded")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        addButton
                    }
                } else {
                    // Active medications
                    if !activeMedications.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("ACTIVE")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(.secondary)
                                .tracking(0.5)

                            ForEach(activeMedications) { medication in
                                medicationRow(medication, isActive: true)
                            }
                        }
                    }

                    // Inactive medications (collapsible)
                    if !inactiveMedications.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    showInactive.toggle()
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Text("INACTIVE (\(inactiveMedications.count))")
                                        .font(.system(size: 10, weight: .semibold))
                                        .tracking(0.5)
                                    Image(systemName: showInactive ? "chevron.up" : "chevron.down")
                                        .font(.system(size: 8, weight: .semibold))
                                }
                                .foregroundStyle(.secondary)
                            }

                            if showInactive {
                                ForEach(inactiveMedications) { medication in
                                    medicationRow(medication, isActive: false)
                                }
                            }
                        }
                    }

                    addButton
                }
            }
        }
        .sheet(item: $editingMedication) { medication in
            ModalSheet(title: "Edit Medication", onDismiss: { editingMedication = nil }) {
                MedicationForm(babyId: babyId, existing: medication) { data in
                    await viewModel.updateMedication(id: medication.id, data, babyId: babyId)
                    editingMedication = nil
                }
            }
        }
    }

    // MARK: - Medication Row

    private func medicationRow(_ medication: Medication, isActive: Bool) -> some View {
        HStack(spacing: 10) {
            // Active/inactive indicator
            Circle()
                .fill(isActive ? Color.green : Color(.systemGray4))
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 2) {
                Text(medication.medicationName)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(isActive ? .primary : .secondary)

                HStack(spacing: 8) {
                    if let dosage = medication.dosage, !dosage.isEmpty {
                        Text(dosage)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    if let frequency = medication.frequency, !frequency.isEmpty {
                        Text(frequency)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 1)
                            .background(Color(.systemGray6))
                            .clipShape(Capsule())
                    }
                }

                // Date range
                HStack(spacing: 4) {
                    Text("Started: \(FormatUtils.formatShortDate(medication.startDate))")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    if let endDate = medication.endDate {
                        Text("- \(FormatUtils.formatShortDate(endDate))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer()

            // Actions
            HStack(spacing: 6) {
                // Toggle active/inactive
                Button {
                    Task {
                        await viewModel.toggleMedicationActive(id: medication.id)
                    }
                } label: {
                    Image(systemName: isActive ? "pause.circle" : "play.circle")
                        .font(.system(size: 20))
                        .foregroundStyle(isActive ? .orange : .green)
                }

                // Edit
                Button {
                    editingMedication = medication
                } label: {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Delete
                Button(role: .destructive) {
                    Task {
                        await viewModel.deleteMedication(id: medication.id)
                    }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red.opacity(0.7))
                }
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .background(
            isActive
                ? Color.green.opacity(0.05)
                : Color(.systemGray6).opacity(0.5)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Add Button

    private var addButton: some View {
        Button(action: onAdd) {
            HStack(spacing: 4) {
                Image(systemName: "plus.circle")
                    .font(.caption)
                Text("Add Medication")
                    .font(.caption.weight(.medium))
            }
            .foregroundStyle(AppColors.Light.primary)
        }
    }
}

// MARK: - Preview

#Preview {
    MedicationQuickLogView(
        medications: [
            Medication(id: 1, babyId: 1, medicationName: "Vitamin D", dosage: "400 IU", frequency: "Daily", startDate: "2025-01-01", endDate: nil, isActive: true, notes: nil),
            Medication(id: 2, babyId: 1, medicationName: "Amoxicillin", dosage: "5ml", frequency: "3x daily", startDate: "2025-02-10", endDate: "2025-02-20", isActive: false, notes: nil),
            Medication(id: 3, babyId: 1, medicationName: "Iron supplement", dosage: "1ml", frequency: "Daily", startDate: "2025-02-01", endDate: nil, isActive: true, notes: nil),
        ],
        viewModel: HealthViewModel(),
        babyId: 1,
        onAdd: {}
    )
    .padding()
}
