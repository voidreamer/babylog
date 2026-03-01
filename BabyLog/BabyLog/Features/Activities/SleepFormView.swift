import SwiftUI

// MARK: - Sleep Request Body

private struct SleepRequest: Encodable {
    let babyId: Int
    let startTime: String
    let endTime: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case notes
    }
}

// MARK: - SleepFormView

struct SleepFormView: View {
    let babyId: Int
    let existing: SleepRecord?
    var onSaved: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @Environment(\.appTheme) private var theme
    @Environment(APIClient.self) private var api

    @State private var startTime: Date = .now
    @State private var endTime: Date = .now
    @State private var hasEndTime: Bool = true
    @State private var notes: String = ""

    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    // Timer for active sleep display
    @State private var elapsedSeconds: Int = 0
    @State private var timerTask: Task<Void, Never>?

    private var isEditing: Bool { existing != nil }

    private var isSleeping: Bool {
        isEditing && existing?.endTime == nil
    }

    // MARK: - Initializer

    init(babyId: Int, existing: SleepRecord? = nil, onSaved: (() -> Void)? = nil) {
        self.babyId = babyId
        self.existing = existing
        self.onSaved = onSaved
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                // Start time
                Section("Start Time") {
                    DatePicker("Start", selection: $startTime)
                }

                // Active timer display when sleeping
                if isSleeping {
                    Section("Currently Sleeping") {
                        HStack {
                            Image(systemName: "moon.zzz.fill")
                                .foregroundStyle(theme.sleep.main)
                                .font(.title2)

                            Spacer()

                            Text(formattedElapsed)
                                .font(.system(.title, design: .monospaced))
                                .foregroundStyle(theme.sleep.main)
                                .contentTransition(.numericText())

                            Spacer()
                        }
                        .padding(.vertical, 8)

                        Button {
                            Task { await endSleep() }
                        } label: {
                            HStack {
                                Spacer()
                                Label("End Sleep", systemImage: "stop.circle.fill")
                                    .fontWeight(.semibold)
                                Spacer()
                            }
                        }
                        .disabled(isSaving)
                    }
                }

                // End time (not currently sleeping)
                if !isSleeping {
                    Section("End Time") {
                        Toggle("Sleep ended", isOn: $hasEndTime)

                        if hasEndTime {
                            DatePicker("End", selection: $endTime)
                        } else {
                            Text("Baby is still sleeping")
                                .foregroundStyle(.secondary)
                                .font(.footnote)
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

                // Save (not shown for active sleep -- use "End Sleep" above)
                if !isSleeping {
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
            .navigationTitle(isEditing ? "Edit Sleep" : "Log Sleep")
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
                title: "Delete Sleep",
                message: "Are you sure? This cannot be undone.",
                confirmLabel: "Delete",
                onConfirm: { Task { await delete() } }
            )
            .onAppear {
                populateFromExisting()
                startTimerIfNeeded()
            }
            .onDisappear {
                timerTask?.cancel()
            }
        }
        .presentationDragIndicator(.visible)
    }

    // MARK: - Elapsed Time Display

    private var formattedElapsed: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }

    private func startTimerIfNeeded() {
        guard isSleeping else { return }
        updateElapsed()
        timerTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { break }
                await MainActor.run { updateElapsed() }
            }
        }
    }

    private func updateElapsed() {
        let start = ISO8601DateFormatter().date(from: existing?.startTime ?? "") ?? startTime
        elapsedSeconds = max(0, Int(Date.now.timeIntervalSince(start)))
    }

    // MARK: - Populate

    private func populateFromExisting() {
        guard let existing else { return }

        let isoFormatter = ISO8601DateFormatter()
        startTime = isoFormatter.date(from: existing.startTime) ?? .now

        if let end = existing.endTime, let endDate = isoFormatter.date(from: end) {
            endTime = endDate
            hasEndTime = true
        } else {
            hasEndTime = false
            endTime = .now
        }

        notes = existing.notes ?? ""
    }

    // MARK: - End Sleep (active session)

    private func endSleep() async {
        guard let existing, let id = existing.id.intValue else { return }
        isSaving = true
        errorMessage = nil

        do {
            _ = try await api.endSleep(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            timerTask?.cancel()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isSaving = false
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        errorMessage = nil

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]

        let body = SleepRequest(
            babyId: babyId,
            startTime: formatter.string(from: startTime),
            endTime: hasEndTime ? formatter.string(from: endTime) : nil,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            if let existing, let id = existing.id.intValue {
                _ = try await api.updateSleep(id: id, body)
            } else {
                _ = try await api.createSleep(body)
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
            try await api.deleteSleep(id: id)
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onSaved?()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
    }
}
