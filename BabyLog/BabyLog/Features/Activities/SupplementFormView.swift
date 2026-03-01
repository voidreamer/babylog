import SwiftUI

// MARK: - Supplement Request Body

private struct SupplementRequest: Encodable {
    let babyId: Int
    let time: String
    let name: String
    let dosage: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case name
        case dosage
        case notes
    }
}

// MARK: - SupplementFormView

struct SupplementFormView: View {
    let babyId: Int
    let existing: Supplement?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var time: Date = .now
    @State private var name: String = ""
    @State private var dosage: String = ""
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private var isEditing: Bool { existing != nil }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Initializer

    init(babyId: Int, existing: Supplement? = nil, onSaved: (() -> Void)? = nil) {
        self.babyId = babyId
        self.existing = existing
        self.onSaved = onSaved
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                // Time
                Section {
                    DatePicker("Time", selection: $time)
                }

                // Name (required)
                Section("Supplement Name") {
                    TextField("e.g. Vitamin D, Iron drops...", text: $name)
                }

                // Dosage
                Section("Dosage") {
                    TextField("e.g. 1 ml, 400 IU... (optional)", text: $dosage)
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
                    .disabled(isSaving || !canSave)
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
            .navigationTitle(isEditing ? "Edit Supplement" : "Log Supplement")
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
                title: "Delete Supplement",
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
        time = ISO8601DateFormatter().date(from: existing.time) ?? .now
        name = existing.name
        dosage = existing.dosage ?? ""
        notes = existing.notes ?? ""
    }

    // MARK: - Save

    private func save() async {
        guard canSave else { return }
        isSaving = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let timeString = formatter.string(from: time)

        let body = SupplementRequest(
            babyId: babyId,
            time: timeString,
            name: name.trimmingCharacters(in: .whitespaces),
            dosage: dosage.isEmpty ? nil : dosage,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updateSupplement(id: id, body)
            } else {
                _ = try await api.createSupplement(body)
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
            try await api.deleteSupplement(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
