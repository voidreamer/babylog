import SwiftUI

// MARK: - TummyTime Request Body

private struct TummyTimeRequest: Encodable {
    let babyId: Int
    let startTime: String
    let durationMinutes: Double
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case startTime = "start_time"
        case durationMinutes = "duration_minutes"
        case notes
    }
}

// MARK: - TummyTimeFormView

struct TummyTimeFormView: View {
    let babyId: Int
    let existing: TummyTime?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var startTime: Date = .now
    @State private var durationMinutes: Double = 5
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    private var isEditing: Bool { existing != nil }

    // MARK: - Initializer

    init(babyId: Int, existing: TummyTime? = nil, onSaved: (() -> Void)? = nil) {
        self.babyId = babyId
        self.existing = existing
        self.onSaved = onSaved
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                // Start time
                Section {
                    DatePicker("Start Time", selection: $startTime)
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
            .navigationTitle(isEditing ? "Edit Tummy Time" : "Log Tummy Time")
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
                title: "Delete Tummy Time",
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
        startTime = ISO8601DateFormatter().date(from: existing.startTime) ?? .now
        durationMinutes = existing.durationMinutes ?? 0
        notes = existing.notes ?? ""
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let timeString = formatter.string(from: startTime)

        let body = TummyTimeRequest(
            babyId: babyId,
            startTime: timeString,
            durationMinutes: durationMinutes,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updateTummyTime(id: id, body)
            } else {
                _ = try await api.createTummyTime(body)
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
            try await api.deleteTummyTime(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
