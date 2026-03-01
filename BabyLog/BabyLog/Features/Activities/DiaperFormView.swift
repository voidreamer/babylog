import SwiftUI

// MARK: - Diaper Request Body

private struct DiaperRequest: Encodable {
    let babyId: Int
    let time: String
    let type: String
    let pooColor: String?
    let pooConsistency: String?
    let pooAmount: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case type
        case pooColor = "poo_color"
        case pooConsistency = "poo_consistency"
        case pooAmount = "poo_amount"
        case notes
    }
}

// MARK: - Poo Detail Enums

private enum PooColor: String, CaseIterable {
    case yellow, green, brown, black, red, orange

    var displayName: String { rawValue.capitalized }
}

private enum PooConsistency: String, CaseIterable {
    case runny, soft, firm, hard

    var displayName: String { rawValue.capitalized }
}

private enum PooAmount: String, CaseIterable {
    case small, medium, large

    var displayName: String { rawValue.capitalized }
}

// MARK: - DiaperFormView

struct DiaperFormView: View {
    let babyId: Int
    let existing: Diaper?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var diaperType: DiaperType = .pee
    @State private var time: Date = .now
    @State private var pooColor: PooColor = .brown
    @State private var pooConsistency: PooConsistency = .soft
    @State private var pooAmount: PooAmount = .medium
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private var isEditing: Bool { existing != nil }

    private var showPooDetails: Bool {
        diaperType == .poo || diaperType == .mixed
    }

    // MARK: - Initializer

    init(babyId: Int, existing: Diaper? = nil, onSaved: (() -> Void)? = nil) {
        self.babyId = babyId
        self.existing = existing
        self.onSaved = onSaved
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                // Type picker
                Section {
                    Picker("Type", selection: $diaperType) {
                        Text("Pee").tag(DiaperType.pee)
                        Text("Poo").tag(DiaperType.poo)
                        Text("Mixed").tag(DiaperType.mixed)
                    }
                    .pickerStyle(.segmented)
                }

                // Time
                Section {
                    DatePicker("Time", selection: $time)
                }

                // Poo details
                if showPooDetails {
                    Section("Poo Details") {
                        Picker("Color", selection: $pooColor) {
                            ForEach(PooColor.allCases, id: \.self) { color in
                                Text(color.displayName).tag(color)
                            }
                        }

                        Picker("Consistency", selection: $pooConsistency) {
                            ForEach(PooConsistency.allCases, id: \.self) { consistency in
                                Text(consistency.displayName).tag(consistency)
                            }
                        }

                        Picker("Amount", selection: $pooAmount) {
                            ForEach(PooAmount.allCases, id: \.self) { amount in
                                Text(amount.displayName).tag(amount)
                            }
                        }
                    }
                }

                // Notes
                Section("Notes") {
                    TextField("Optional notes...", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }

                // Error
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }

                // Save
                Section {
                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            Spacer()
                            if isSaving {
                                ProgressView()
                            } else {
                                Text(isEditing ? "Update" : "Save")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isSaving)
                }

                // Delete (edit mode only)
                if isEditing {
                    Section {
                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            HStack {
                                Spacer()
                                Text("Delete")
                                Spacer()
                            }
                        }
                        .disabled(isSaving)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Diaper" : "Log Diaper")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 20))
                            .symbolRenderingMode(.hierarchical)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .confirmDialog(
                isPresented: $showDeleteConfirm,
                title: "Delete Diaper",
                message: "Are you sure? This cannot be undone.",
                confirmLabel: "Delete",
                onConfirm: { Task { await delete() } }
            )
            .onAppear { populateFromExisting() }
        }
        .presentationDragIndicator(.visible)
    }

    // MARK: - Populate

    private func populateFromExisting() {
        guard let existing else { return }
        diaperType = existing.type
        time = ISO8601DateFormatter().date(from: existing.time) ?? .now
        if let color = existing.pooColor, let parsed = PooColor(rawValue: color) {
            pooColor = parsed
        }
        if let consistency = existing.pooConsistency, let parsed = PooConsistency(rawValue: consistency) {
            pooConsistency = parsed
        }
        if let amount = existing.pooAmount, let parsed = PooAmount(rawValue: amount) {
            pooAmount = parsed
        }
        notes = existing.notes ?? ""
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let timeString = formatter.string(from: time)

        let body = DiaperRequest(
            babyId: babyId,
            time: timeString,
            type: diaperType.rawValue,
            pooColor: showPooDetails ? pooColor.rawValue : nil,
            pooConsistency: showPooDetails ? pooConsistency.rawValue : nil,
            pooAmount: showPooDetails ? pooAmount.rawValue : nil,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updateDiaper(id: id, body)
            } else {
                _ = try await api.createDiaper(body)
            }
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }

    // MARK: - Delete

    private func delete() async {
        guard let existing, let id = existing.id.intValue else { return }
        isSaving = true
        do {
            try await api.deleteDiaper(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
