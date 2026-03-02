import SwiftUI

// MARK: - EventEditView

struct EventEditView: View {
    let event: TimelineEvent
    let babyId: Int
    let apiClient: APIClient
    let onSave: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    // Common
    @State private var time: Date = Date()
    @State private var notes: String = ""
    @State private var isSaving = false

    // Feeding
    @State private var feedType: String = "breast"
    @State private var duration: String = ""
    @State private var amount: String = ""

    // Diaper
    @State private var diaperType: String = "pee"

    // Sleep
    @State private var startTime: Date = Date()
    @State private var endTime: Date = Date()

    // Pumping (reuses duration + amount)

    // Potty
    @State private var pottyResult: String = "success"
    @State private var pottyType: String = ""

    // Tummy Time (reuses duration)

    // Supplement
    @State private var supplementName: String = ""
    @State private var dosage: String = ""

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        NavigationStack {
            Form {
                // Time section
                if event.eventType == "sleep" {
                    Section("Time") {
                        DatePicker("Start", selection: $startTime, displayedComponents: [.date, .hourAndMinute])
                        DatePicker("End", selection: $endTime, displayedComponents: [.date, .hourAndMinute])
                    }
                } else {
                    Section("Time") {
                        DatePicker("Time", selection: $time, displayedComponents: [.date, .hourAndMinute])
                    }
                }

                // Type-specific fields
                switch event.eventType {
                case "feeding":     feedingSection
                case "diaper":      diaperSection
                case "pumping":     pumpingSection
                case "potty":       pottySection
                case "tummy", "tummy_time": tummySection
                case "supplement":  supplementSection
                case "bath":        EmptyView() // Bath only has time + notes
                default:            EmptyView()
                }

                // Notes
                Section("Notes") {
                    TextField("Add notes...", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Edit \(eventDisplayName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
        .onAppear { loadEventData() }
    }

    // MARK: - Type-Specific Sections

    private var feedingSection: some View {
        Section("Details") {
            Picker("Type", selection: $feedType) {
                Text("Breast").tag("breast")
                Text("Bottle").tag("bottle")
                Text("Formula").tag("formula")
                Text("Solid").tag("solid")
            }
            .pickerStyle(.segmented)

            HStack {
                Text("Duration")
                Spacer()
                TextField("min", text: $duration)
                    .keyboardType(.numberPad)
                    .frame(width: 60)
                    .multilineTextAlignment(.trailing)
                Text("min")
                    .foregroundStyle(.secondary)
            }

            HStack {
                Text("Amount")
                Spacer()
                TextField("ml", text: $amount)
                    .keyboardType(.numberPad)
                    .frame(width: 60)
                    .multilineTextAlignment(.trailing)
                Text("ml")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var diaperSection: some View {
        Section("Type") {
            Picker("Type", selection: $diaperType) {
                Text("Pee").tag("pee")
                Text("Poo").tag("poo")
                Text("Mixed").tag("mixed")
            }
            .pickerStyle(.segmented)
        }
    }

    private var pumpingSection: some View {
        Section("Details") {
            HStack {
                Text("Duration")
                Spacer()
                TextField("min", text: $duration)
                    .keyboardType(.numberPad)
                    .frame(width: 60)
                    .multilineTextAlignment(.trailing)
                Text("min")
                    .foregroundStyle(.secondary)
            }

            HStack {
                Text("Amount")
                Spacer()
                TextField("ml", text: $amount)
                    .keyboardType(.numberPad)
                    .frame(width: 60)
                    .multilineTextAlignment(.trailing)
                Text("ml")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var pottySection: some View {
        Section("Result") {
            Picker("Result", selection: $pottyResult) {
                Text("Success").tag("success")
                Text("Attempt").tag("attempt")
                Text("Accident").tag("accident")
            }
            .pickerStyle(.segmented)

            Picker("Type", selection: $pottyType) {
                Text("None").tag("")
                Text("Pee").tag("pee")
                Text("Poo").tag("poo")
                Text("Both").tag("both")
            }
        }
    }

    private var tummySection: some View {
        Section("Duration") {
            HStack {
                Text("Duration")
                Spacer()
                TextField("min", text: $duration)
                    .keyboardType(.numberPad)
                    .frame(width: 60)
                    .multilineTextAlignment(.trailing)
                Text("min")
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var supplementSection: some View {
        Section("Details") {
            Picker("Supplement", selection: $supplementName) {
                Text("Vitamin D").tag("Vitamin D")
                Text("Iron").tag("Iron")
                Text("DHA").tag("DHA")
                Text("Probiotic").tag("Probiotic")
                Text("Multivitamin").tag("Multivitamin")
                Text("Other").tag("Other")
            }

            TextField("Dosage", text: $dosage)
        }
    }

    // MARK: - Load Event Data

    private func loadEventData() {
        let details = event.details

        // Parse time
        if event.eventType == "sleep" {
            if let date = parseDate(event.time) {
                startTime = date
            }
            if let endStr = stringVal(details, "end_time"), let date = parseDate(endStr) {
                endTime = date
            }
        } else {
            if let date = parseDate(event.time) {
                time = date
            }
        }

        notes = stringVal(details, "notes") ?? ""

        switch event.eventType {
        case "feeding":
            feedType = stringVal(details, "type") ?? "breast"
            if let d = numVal(details, "duration_minutes") { duration = String(Int(d)) }
            if let a = numVal(details, "amount_ml") { amount = String(Int(a)) }

        case "diaper":
            diaperType = stringVal(details, "type") ?? "pee"

        case "pumping":
            if let d = numVal(details, "duration_minutes") { duration = String(Int(d)) }
            if let a = numVal(details, "amount_ml") { amount = String(Int(a)) }

        case "potty":
            pottyResult = stringVal(details, "result") ?? "success"
            pottyType = stringVal(details, "potty_type") ?? ""

        case "tummy", "tummy_time":
            if let d = numVal(details, "duration_minutes") { duration = String(Int(d)) }

        case "supplement":
            supplementName = stringVal(details, "name") ?? ""
            dosage = stringVal(details, "dosage") ?? ""

        default:
            break
        }
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let timeISO = formatISO(time)
        let notesVal = notes.isEmpty ? nil : notes

        do {
            switch event.eventType {
            case "feeding":
                try await apiClient.updateFeeding(id: event.id, FeedingPayload(
                    baby_id: babyId, time: timeISO, type: feedType,
                    duration_minutes: Double(duration), amount_ml: Double(amount), notes: notesVal
                ))

            case "diaper":
                try await apiClient.updateDiaper(id: event.id, DiaperPayload(
                    baby_id: babyId, time: timeISO, type: diaperType, notes: notesVal
                ))

            case "sleep":
                try await apiClient.updateSleep(id: event.id, SleepPayload(
                    baby_id: babyId, start_time: formatISO(startTime),
                    end_time: formatISO(endTime), notes: notesVal
                ))

            case "pumping":
                try await apiClient.updatePumping(id: event.id, PumpingPayload(
                    baby_id: babyId, time: timeISO,
                    duration_minutes: Double(duration), amount_ml: Double(amount), notes: notesVal
                ))

            case "potty":
                try await apiClient.updatePottyLog(id: event.id, PottyPayload(
                    baby_id: babyId, time: timeISO, result: pottyResult,
                    potty_type: pottyType.isEmpty ? nil : pottyType, notes: notesVal
                ))

            case "tummy", "tummy_time":
                try await apiClient.updateTummyTime(id: event.id, TummyPayload(
                    baby_id: babyId, start_time: timeISO,
                    duration_minutes: Double(duration) ?? 0, notes: notesVal
                ))

            case "bath":
                try await apiClient.updateBath(id: event.id, BathPayload(
                    baby_id: babyId, time: timeISO, notes: notesVal
                ))

            case "supplement":
                try await apiClient.updateSupplement(id: event.id, SupplementPayload(
                    baby_id: babyId, time: timeISO, name: supplementName,
                    dosage: dosage.isEmpty ? nil : dosage, notes: notesVal
                ))

            default:
                break
            }

            onSave()
            dismiss()
        } catch {
            // TODO: Show error toast
        }
    }

    // MARK: - Helpers

    private var eventDisplayName: String {
        switch event.eventType {
        case "feeding":     return "Feeding"
        case "diaper":      return "Diaper"
        case "sleep":       return "Sleep"
        case "pumping":     return "Pumping"
        case "potty":       return "Potty"
        case "tummy", "tummy_time": return "Tummy Time"
        case "bath":        return "Bath"
        case "supplement":  return "Supplement"
        default:            return event.eventType.capitalized
        }
    }

    private func stringVal(_ details: [String: AnyCodable], _ key: String) -> String? {
        guard let codable = details[key] else { return nil }
        return codable.value.base as? String
    }

    private func numVal(_ details: [String: AnyCodable], _ key: String) -> Double? {
        guard let codable = details[key] else { return nil }
        if let intVal = codable.value.base as? Int { return Double(intVal) }
        return codable.value.base as? Double
    }

    private func parseDate(_ isoString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: isoString) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: isoString)
    }

    private func formatISO(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: date)
    }
}

// MARK: - API Payloads

private struct FeedingPayload: Encodable {
    let baby_id: Int
    let time: String
    let type: String
    let duration_minutes: Double?
    let amount_ml: Double?
    let notes: String?
}

private struct DiaperPayload: Encodable {
    let baby_id: Int
    let time: String
    let type: String
    let notes: String?
}

private struct SleepPayload: Encodable {
    let baby_id: Int
    let start_time: String
    let end_time: String
    let notes: String?
}

private struct PumpingPayload: Encodable {
    let baby_id: Int
    let time: String
    let duration_minutes: Double?
    let amount_ml: Double?
    let notes: String?
}

private struct PottyPayload: Encodable {
    let baby_id: Int
    let time: String
    let result: String
    let potty_type: String?
    let notes: String?
}

private struct TummyPayload: Encodable {
    let baby_id: Int
    let start_time: String
    let duration_minutes: Double
    let notes: String?
}

private struct BathPayload: Encodable {
    let baby_id: Int
    let time: String
    let notes: String?
}

private struct SupplementPayload: Encodable {
    let baby_id: Int
    let time: String
    let name: String
    let dosage: String?
    let notes: String?
}
