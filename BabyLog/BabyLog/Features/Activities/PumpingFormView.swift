import SwiftUI

// MARK: - Pumping Request Body

private struct PumpingRequest: Encodable {
    let babyId: Int
    let time: String
    let durationMinutes: Double?
    let amountMl: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case durationMinutes = "duration_minutes"
        case amountMl = "amount_ml"
        case notes
    }
}

// MARK: - PumpingFormView

struct PumpingFormView: View {
    let babyId: Int
    let existing: Pumping?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var time: Date = .now
    @State private var durationMinutes: Double = 15
    @State private var amountMl: Double = 60
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private var isEditing: Bool { existing != nil }

    // MARK: - Initializer

    init(babyId: Int, existing: Pumping? = nil, onSaved: (() -> Void)? = nil) {
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

                // Duration
                Section("Duration") {
                    HStack {
                        Text("\(Int(durationMinutes)) min")
                            .monospacedDigit()
                        Spacer()
                        Stepper("", value: $durationMinutes, in: 1...120, step: 1)
                            .labelsHidden()
                    }
                }

                // Amount
                Section("Amount") {
                    HStack {
                        Text("\(Int(amountMl)) ml")
                            .monospacedDigit()
                        Spacer()
                        Stepper("", value: $amountMl, in: 0...500, step: 5)
                            .labelsHidden()
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
            .navigationTitle(isEditing ? "Edit Pumping" : "Log Pumping")
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
                title: "Delete Pumping",
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
        durationMinutes = existing.durationMinutes ?? 15
        amountMl = existing.amountMl ?? 60
        notes = existing.notes ?? ""
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let timeString = formatter.string(from: time)

        let body = PumpingRequest(
            babyId: babyId,
            time: timeString,
            durationMinutes: durationMinutes,
            amountMl: amountMl,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updatePumping(id: id, body)
            } else {
                _ = try await api.createPumping(body)
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
            try await api.deletePumping(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
