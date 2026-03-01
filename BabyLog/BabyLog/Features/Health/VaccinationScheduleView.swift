import SwiftUI

// MARK: - VaccinationScheduleView

struct VaccinationScheduleView: View {
    let vaccinations: [Vaccination]
    let viewModel: HealthViewModel
    let babyId: Int
    let onAdd: () -> Void

    @State private var editingVaccination: Vaccination?

    var body: some View {
        List {
            if groupedVaccinations.isEmpty {
                Section {
                    EmptyStateView(
                        icon: "syringe",
                        title: "No Vaccinations",
                        subtitle: "Tap the button below to add a vaccination record.",
                        actionLabel: "Add Vaccination",
                        action: onAdd
                    )
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            } else {
                // Upcoming / due section
                if !upcomingDue.isEmpty {
                    Section("Upcoming") {
                        ForEach(upcomingDue, id: \.vaccineName) { vaccination in
                            upcomingRow(vaccination)
                        }
                    }
                }

                // Grouped by vaccine name
                ForEach(sortedVaccineNames, id: \.self) { name in
                    Section(name) {
                        let doses = groupedVaccinations[name] ?? []
                        ForEach(doses) { vaccination in
                            vaccinationRow(vaccination)
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        Task {
                                            await viewModel.deleteVaccination(id: vaccination.id)
                                        }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }

                                    Button {
                                        editingVaccination = vaccination
                                    } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
                                }
                        }
                    }
                }
            }
        }
        .navigationTitle("Vaccinations")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: onAdd) {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(item: $editingVaccination) { vaccination in
            ModalSheet(title: "Edit Vaccination", onDismiss: { editingVaccination = nil }) {
                VaccinationForm(
                    babyId: babyId,
                    existing: vaccination
                ) { data in
                    await viewModel.updateVaccination(id: vaccination.id, data, babyId: babyId)
                    editingVaccination = nil
                }
            }
        }
    }

    // MARK: - Grouped Data

    private var groupedVaccinations: [String: [Vaccination]] {
        Dictionary(grouping: vaccinations, by: \.vaccineName)
    }

    private var sortedVaccineNames: [String] {
        groupedVaccinations.keys.sorted()
    }

    private var upcomingDue: [Vaccination] {
        let today = FormatUtils.toDateString(Date())
        return vaccinations
            .filter { vaccination in
                guard let nextDue = vaccination.nextDueDate else { return false }
                return nextDue >= today
            }
            .sorted { ($0.nextDueDate ?? "") < ($1.nextDueDate ?? "") }
    }

    // MARK: - Row Views

    private func vaccinationRow(_ vaccination: Vaccination) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Label("Dose \(vaccination.doseNumber)", systemImage: "syringe")
                    .font(.subheadline.weight(.medium))

                Spacer()

                Text(FormatUtils.formatDisplayDate(vaccination.givenDate))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let administeredBy = vaccination.administeredBy, !administeredBy.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "person")
                        .font(.caption2)
                    Text(administeredBy)
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }

            if let notes = vaccination.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 2)
    }

    private func upcomingRow(_ vaccination: Vaccination) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(vaccination.vaccineName)
                    .font(.subheadline.weight(.medium))
                Text("Dose \(vaccination.doseNumber + 1)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let nextDue = vaccination.nextDueDate {
                HStack(spacing: 4) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.caption)
                    Text(FormatUtils.formatDisplayDate(nextDue))
                        .font(.caption.weight(.medium))
                }
                .foregroundStyle(.orange)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.orange.opacity(0.12))
                .clipShape(Capsule())
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        VaccinationScheduleView(
            vaccinations: [
                Vaccination(id: 1, babyId: 1, vaccineName: "DTaP", doseNumber: 1, givenDate: "2025-03-01", administeredBy: "Dr. Smith", nextDueDate: "2025-05-01", notes: nil),
                Vaccination(id: 2, babyId: 1, vaccineName: "DTaP", doseNumber: 2, givenDate: "2025-05-01", administeredBy: "Dr. Smith", nextDueDate: "2025-07-01", notes: nil),
                Vaccination(id: 3, babyId: 1, vaccineName: "Hepatitis B", doseNumber: 1, givenDate: "2025-01-01", administeredBy: nil, nextDueDate: "2025-02-01", notes: "Given at birth"),
            ],
            viewModel: HealthViewModel(),
            babyId: 1,
            onAdd: {}
        )
    }
}
