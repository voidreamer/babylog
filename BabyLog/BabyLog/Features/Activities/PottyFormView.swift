import SwiftUI

// MARK: - Potty Request Body

private struct PottyRequest: Encodable {
    let babyId: Int
    let time: String
    let result: String
    let pottyType: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case result
        case pottyType = "potty_type"
        case notes
    }
}

// MARK: - PottyFormView

struct PottyFormView: View {
    let babyId: Int
    let existing: PottyLog?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var time: Date = .now
    @State private var result: PottyResult = .attempt
    @State private var pottyType: String = ""
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private var isEditing: Bool { existing != nil }

    // MARK: - Initializer

    init(babyId: Int, existing: PottyLog? = nil, onSaved: (() -> Void)? = nil) {
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

                // Result picker
                Section("Result") {
                    Picker("Result", selection: $result) {
                        Text("Success").tag(PottyResult.success)
                        Text("Attempt").tag(PottyResult.attempt)
                        Text("Accident").tag(PottyResult.accident)
                    }
                    .pickerStyle(.segmented)
                }

                // Potty type
                Section("Potty Type") {
                    TextField("e.g. toilet, training seat... (optional)", text: $pottyType)
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
            .navigationTitle(isEditing ? "Edit Potty" : "Log Potty")
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
                title: "Delete Potty Log",
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
        result = existing.result
        pottyType = existing.pottyType ?? ""
        notes = existing.notes ?? ""
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let timeString = formatter.string(from: time)

        let body = PottyRequest(
            babyId: babyId,
            time: timeString,
            result: result.rawValue,
            pottyType: pottyType.isEmpty ? nil : pottyType,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updatePottyLog(id: id, body)
            } else {
                _ = try await api.createPottyLog(body)
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
            try await api.deletePottyLog(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
