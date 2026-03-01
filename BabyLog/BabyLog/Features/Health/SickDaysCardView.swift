import SwiftUI

// MARK: - SickDaysCardView

struct SickDaysCardView: View {
    let sickDays: [SickDay]
    let viewModel: HealthViewModel
    let babyId: Int

    @State private var showAddForm = false
    @State private var editingSickDay: SickDay?
    @State private var isExpanded = false

    /// Show first 3 by default, expand to show all.
    private var displayedSickDays: [SickDay] {
        if isExpanded {
            return sickDays
        }
        return Array(sickDays.prefix(3))
    }

    var body: some View {
        WidgetCard(title: "Sick Days", icon: "thermometer.medium", accentColor: .red) {
            VStack(alignment: .leading, spacing: 10) {
                if sickDays.isEmpty {
                    HStack {
                        Text("No sick days recorded")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        addButton
                    }
                } else {
                    ForEach(displayedSickDays) { sickDay in
                        sickDayRow(sickDay)
                        if sickDay.id != displayedSickDays.last?.id {
                            Divider()
                        }
                    }

                    HStack {
                        if sickDays.count > 3 {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    isExpanded.toggle()
                                }
                            } label: {
                                Text(isExpanded ? "Show Less" : "Show All (\(sickDays.count))")
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
        .sheet(isPresented: $showAddForm) {
            ModalSheet(title: "Add Sick Day", onDismiss: { showAddForm = false }) {
                SickDayForm(babyId: babyId) { data in
                    await viewModel.createSickDay(data, babyId: babyId)
                    showAddForm = false
                }
            }
        }
        .sheet(item: $editingSickDay) { sickDay in
            ModalSheet(title: "Edit Sick Day", onDismiss: { editingSickDay = nil }) {
                SickDayForm(babyId: babyId, existing: sickDay) { data in
                    await viewModel.updateSickDay(id: sickDay.id, data, babyId: babyId)
                    editingSickDay = nil
                }
            }
        }
    }

    // MARK: - Sick Day Row

    private func sickDayRow(_ sickDay: SickDay) -> some View {
        HStack(alignment: .top, spacing: 10) {
            // Date badge
            VStack(spacing: 2) {
                let dateComponents = sickDay.date.split(separator: "-")
                if dateComponents.count >= 3 {
                    Text(String(dateComponents[2]))
                        .font(.system(size: 18, weight: .bold))
                    Text(monthAbbrev(from: String(dateComponents[1])))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: 36)

            VStack(alignment: .leading, spacing: 6) {
                // Temperature
                if let temp = sickDay.temperature {
                    HStack(spacing: 4) {
                        Image(systemName: "thermometer.medium")
                            .font(.caption)
                            .foregroundStyle(temperatureColor(temp))
                        Text(String(format: "%.1f\u{00B0}C", temp))
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(temperatureColor(temp))
                    }
                }

                // Symptoms tags
                if !sickDay.symptoms.isEmpty {
                    FlowLayout(spacing: 4) {
                        ForEach(sickDay.symptoms, id: \.self) { symptom in
                            Text(symptom)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color(.systemGray6))
                                .clipShape(Capsule())
                        }
                    }
                }

                // Notes
                if let notes = sickDay.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            // Action buttons
            VStack(spacing: 8) {
                Button {
                    editingSickDay = sickDay
                } label: {
                    Image(systemName: "pencil")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Button(role: .destructive) {
                    Task {
                        await viewModel.deleteSickDay(id: sickDay.id)
                    }
                } label: {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red.opacity(0.7))
                }
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    private func temperatureColor(_ temp: Double) -> Color {
        if temp >= 39.0 { return .red }
        if temp >= 38.0 { return .orange }
        return .primary
    }

    private func monthAbbrev(from monthStr: String) -> String {
        let months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        guard let month = Int(monthStr), month >= 1, month <= 12 else { return "" }
        return months[month]
    }

    private var addButton: some View {
        Button {
            showAddForm = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "plus.circle")
                    .font(.caption)
                Text("Add")
                    .font(.caption.weight(.medium))
            }
            .foregroundStyle(AppColors.Light.primary)
        }
    }
}

// MARK: - FlowLayout

/// A simple flow layout that wraps content to the next line.
struct FlowLayout: Layout {
    var spacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified
            )
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        var totalWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth, currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            totalWidth = max(totalWidth, currentX)
            totalHeight = max(totalHeight, currentY + lineHeight)
        }

        return (CGSize(width: totalWidth, height: totalHeight), positions)
    }
}

// MARK: - Preview

#Preview {
    SickDaysCardView(
        sickDays: [
            SickDay(id: 1, babyId: 1, date: "2025-02-20", symptoms: ["Fever", "Cough", "Runny Nose"], temperature: 38.5, notes: "Started in the evening"),
            SickDay(id: 2, babyId: 1, date: "2025-01-10", symptoms: ["Rash"], temperature: nil, notes: nil),
        ],
        viewModel: HealthViewModel(),
        babyId: 1
    )
    .padding()
}
