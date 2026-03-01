import SwiftUI

// MARK: - RecordsSectionView (Doctor Visits)

struct RecordsSectionView: View {
    let doctorVisits: [DoctorVisit]
    let viewModel: HealthViewModel
    let babyId: Int
    let onAdd: () -> Void

    @State private var editingVisit: DoctorVisit?
    @State private var isExpanded = false

    private var displayedVisits: [DoctorVisit] {
        if isExpanded {
            return doctorVisits
        }
        return Array(doctorVisits.prefix(3))
    }

    var body: some View {
        WidgetCard(title: "Doctor Visits", icon: "stethoscope", accentColor: .indigo) {
            VStack(alignment: .leading, spacing: 10) {
                if doctorVisits.isEmpty {
                    HStack {
                        Text("No doctor visits recorded")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        addButton
                    }
                } else {
                    ForEach(displayedVisits) { visit in
                        visitRow(visit)
                        if visit.id != displayedVisits.last?.id {
                            Divider()
                        }
                    }

                    HStack {
                        if doctorVisits.count > 3 {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    isExpanded.toggle()
                                }
                            } label: {
                                Text(isExpanded ? "Show Less" : "Show All (\(doctorVisits.count))")
                                    .font(.caption.weight(.medium))
                                    .foregroundStyle(AppColors.Light.primary)
                            }
                        }

                        Spacer()
                        addButton
                    }
                }
            }
        }
        .sheet(item: $editingVisit) { visit in
            ModalSheet(title: "Edit Doctor Visit", onDismiss: { editingVisit = nil }) {
                DoctorVisitForm(babyId: babyId, existing: visit) { data in
                    await viewModel.updateDoctorVisit(id: visit.id, data, babyId: babyId)
                    editingVisit = nil
                }
            }
        }
    }

    // MARK: - Visit Row

    private func visitRow(_ visit: DoctorVisit) -> some View {
        HStack(alignment: .top, spacing: 12) {
            // Visit type icon
            VStack {
                Image(systemName: visitTypeIcon(visit.visitType ?? "checkup"))
                    .font(.system(size: 16))
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(visitTypeColor(visit.visitType ?? "checkup"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            VStack(alignment: .leading, spacing: 4) {
                // Type and date
                HStack {
                    Text((visit.visitType ?? "Visit").capitalized)
                        .font(.subheadline.weight(.medium))
                    Spacer()
                    Text(FormatUtils.formatDisplayDate(visit.visitDate))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Doctor name
                if let doctor = visit.doctorName, !doctor.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "person")
                            .font(.caption2)
                        Text(doctor)
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }

                // Measurements
                let measurements = measurementsText(visit)
                if !measurements.isEmpty {
                    HStack(spacing: 8) {
                        ForEach(measurements, id: \.self) { measurement in
                            Text(measurement)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color(.systemGray6))
                                .clipShape(Capsule())
                        }
                    }
                }

                // Next visit
                if let nextVisit = visit.nextVisitDate, !nextVisit.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.caption2)
                        Text("Next: \(FormatUtils.formatDisplayDate(nextVisit))")
                            .font(.caption2)
                    }
                    .foregroundStyle(.orange)
                }

                // Notes
                if let notes = visit.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            // Action buttons
            VStack(spacing: 8) {
                Button {
                    editingVisit = visit
                } label: {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button(role: .destructive) {
                    Task {
                        await viewModel.deleteDoctorVisit(id: visit.id)
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

    // MARK: - Helpers

    private func visitTypeIcon(_ type: String) -> String {
        switch type.lowercased() {
        case "checkup", "well-baby": return "stethoscope"
        case "vaccination": return "syringe"
        case "sick": return "thermometer.medium"
        case "emergency": return "cross.case"
        case "specialist": return "person.badge.clock"
        default: return "stethoscope"
        }
    }

    private func visitTypeColor(_ type: String) -> Color {
        switch type.lowercased() {
        case "checkup", "well-baby": return .indigo
        case "vaccination": return .purple
        case "sick": return .orange
        case "emergency": return .red
        case "specialist": return .teal
        default: return .indigo
        }
    }

    private func measurementsText(_ visit: DoctorVisit) -> [String] {
        var results: [String] = []
        if let w = visit.weightKg {
            results.append(FormatUtils.formatWeight(kg: w, useLbs: false))
        }
        if let h = visit.heightCm {
            results.append(FormatUtils.formatHeight(cm: h, useIn: false))
        }
        if let hc = visit.headCm {
            results.append("Head: \(FormatUtils.formatHeight(cm: hc, useIn: false))")
        }
        return results
    }

    private var addButton: some View {
        Button(action: onAdd) {
            HStack(spacing: 4) {
                Image(systemName: "plus.circle")
                    .font(.caption)
                Text("Add Visit")
                    .font(.caption.weight(.medium))
            }
            .foregroundStyle(AppColors.Light.primary)
        }
    }
}

// MARK: - Preview

#Preview {
    RecordsSectionView(
        doctorVisits: [
            DoctorVisit(id: 1, babyId: 1, visitDate: "2025-02-15", visitType: "checkup", doctorName: "Dr. Johnson", weightKg: 7.2, heightCm: 65.5, headCm: 42.0, nextVisitDate: "2025-04-15", notes: "All good, meeting milestones"),
            DoctorVisit(id: 2, babyId: 1, visitDate: "2025-01-10", visitType: "vaccination", doctorName: "Dr. Johnson", weightKg: 6.5, heightCm: 62.0, headCm: nil, nextVisitDate: nil, notes: nil),
            DoctorVisit(id: 3, babyId: 1, visitDate: "2024-12-20", visitType: "sick", doctorName: "Dr. Lee", weightKg: nil, heightCm: nil, headCm: nil, nextVisitDate: nil, notes: "Upper respiratory infection"),
        ],
        viewModel: HealthViewModel(),
        babyId: 1,
        onAdd: {}
    )
    .padding()
}
