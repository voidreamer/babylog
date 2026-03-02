import SwiftUI

// MARK: - Feeding Request Body

private struct FeedingRequest: Encodable {
    let babyId: Int
    let time: String
    let type: String
    let durationMinutes: Double?
    let amountMl: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case type
        case durationMinutes = "duration_minutes"
        case amountMl = "amount_ml"
        case notes
    }
}

// MARK: - FeedingFormView

struct FeedingFormView: View {
    let babyId: Int
    let existing: Feeding?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var feedingType: FeedingType = .breast
    @State private var time: Date = .now
    @State private var durationMinutes: Double = 15
    @State private var amountMl: Double = 60
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?
    @State private var showSuccess = false

    private var isEditing: Bool { existing != nil }

    private var showDuration: Bool {
        feedingType == .breast
    }

    private var showAmount: Bool {
        feedingType == .bottle || feedingType == .formula || feedingType == .breastmilkBottle
    }

    // MARK: - Initializer

    init(babyId: Int, existing: Feeding? = nil, onSaved: (() -> Void)? = nil) {
        self.babyId = babyId
        self.existing = existing
        self.onSaved = onSaved
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                // Type picker — custom pills
                Section {
                    ActivityPillPicker(
                        options: [
                            (value: FeedingType.breast, label: "Breast", icon: "hand.raised.fill"),
                            (value: FeedingType.bottle, label: "Bottle", icon: "cup.and.saucer.fill"),
                            (value: FeedingType.formula, label: "Formula", icon: "flask.fill"),
                            (value: FeedingType.breastmilkBottle, label: "BM Bottle", icon: "drop.fill"),
                            (value: FeedingType.solid, label: "Solid", icon: "carrot.fill"),
                        ],
                        selection: $feedingType,
                        colorSet: theme.feeding
                    )
                }

                // Time
                Section {
                    DatePicker("Time", selection: $time)
                }

                // Duration (breast only)
                if showDuration {
                    Section("Duration") {
                        QuantityStepper(
                            label: "Duration",
                            unit: "min",
                            value: $durationMinutes,
                            range: 1...120,
                            step: 1,
                            accentColor: theme.feeding.main
                        )
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }

                // Amount (bottle/formula/breastmilk bottle)
                if showAmount {
                    Section("Amount") {
                        QuantityStepper(
                            label: "Amount",
                            unit: "ml",
                            value: $amountMl,
                            range: 0...500,
                            step: 5,
                            accentColor: theme.feeding.main
                        )
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
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
                            .font(.appBody(size: 14))
                    }
                }

                // Save
                Section {
                    FormSaveButton(
                        label: isEditing ? "Update" : "Save Feeding",
                        accentColor: theme.feeding.main,
                        isLoading: isSaving
                    ) {
                        Task { await save() }
                    }
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
            .animation(.appSnappy, value: feedingType)
            .navigationTitle(isEditing ? "Edit Feeding" : "Log Feeding")
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
                title: "Delete Feeding",
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
        feedingType = existing.type
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

        let body = FeedingRequest(
            babyId: babyId,
            time: timeString,
            type: feedingType.rawValue,
            durationMinutes: showDuration ? durationMinutes : nil,
            amountMl: showAmount ? amountMl : nil,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updateFeeding(id: id, body)
            } else {
                _ = try await api.createFeeding(body)
            }
            HapticFeedback.success()
            onSaved?()
            dismiss()
        } catch {
            HapticFeedback.error()
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }

    // MARK: - Delete

    private func delete() async {
        guard let existing, let id = existing.id.intValue else { return }
        isSaving = true
        do {
            try await api.deleteFeeding(id: id)
            HapticFeedback.success()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
