import SwiftUI

// MARK: - Request Bodies

struct GrowthRecordRequest: Encodable {
    let babyId: Int
    let recordedDate: String
    let weightKg: Double?
    let heightCm: Double?
    let headCm: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case recordedDate = "recorded_date"
        case weightKg = "weight_kg"
        case heightCm = "height_cm"
        case headCm = "head_cm"
        case notes
    }
}

struct DoctorVisitRequest: Encodable {
    let babyId: Int
    let visitDate: String
    let visitType: String
    let doctorName: String?
    let weightKg: Double?
    let heightCm: Double?
    let headCm: Double?
    let nextVisitDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case visitDate = "visit_date"
        case visitType = "visit_type"
        case doctorName = "doctor_name"
        case weightKg = "weight_kg"
        case heightCm = "height_cm"
        case headCm = "head_cm"
        case nextVisitDate = "next_visit_date"
        case notes
    }
}

struct VaccinationRequest: Encodable {
    let babyId: Int
    let vaccineName: String
    let doseNumber: Int
    let givenDate: String
    let administeredBy: String?
    let nextDueDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case vaccineName = "vaccine_name"
        case doseNumber = "dose_number"
        case givenDate = "given_date"
        case administeredBy = "administered_by"
        case nextDueDate = "next_due_date"
        case notes
    }
}

struct AllergyRequest: Encodable {
    let babyId: Int
    let allergen: String
    let severity: String?
    let reaction: String?
    let discoveredDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case allergen
        case severity
        case reaction
        case discoveredDate = "discovered_date"
        case notes
    }
}

struct SickDayRequest: Encodable {
    let babyId: Int
    let date: String
    let symptoms: [String]
    let temperature: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case date
        case symptoms
        case temperature
        case notes
    }
}

struct MedicationRequest: Encodable {
    let babyId: Int
    let medicationName: String
    let dosage: String?
    let frequency: String?
    let startDate: String
    let endDate: String?
    let isActive: Bool
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case medicationName = "medication_name"
        case dosage
        case frequency
        case startDate = "start_date"
        case endDate = "end_date"
        case isActive = "is_active"
        case notes
    }
}

// MARK: - GrowthRecordForm

struct GrowthRecordForm: View {
    let babyId: Int
    var existing: GrowthRecord?
    let onSave: (GrowthRecordRequest) async -> Void

    @State private var recordedDate = Date()
    @State private var weightStr = ""
    @State private var heightStr = ""
    @State private var headStr = ""
    @State private var notes = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Date") {
                DatePicker("Recorded Date", selection: $recordedDate, in: ...Date(), displayedComponents: .date)
            }

            Section("Measurements") {
                HStack {
                    Text("Weight (kg)")
                    Spacer()
                    TextField("e.g. 7.2", text: $weightStr)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }

                HStack {
                    Text("Height (cm)")
                    Spacer()
                    TextField("e.g. 65.5", text: $heightStr)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }

                HStack {
                    Text("Head (cm)")
                    Spacer()
                    TextField("e.g. 42.0", text: $headStr)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }
            }

            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = GrowthRecordRequest(
                            babyId: babyId,
                            recordedDate: FormatUtils.toDateString(recordedDate),
                            weightKg: Double(weightStr),
                            heightCm: Double(heightStr),
                            headCm: Double(headStr),
                            notes: notes.isEmpty ? nil : notes
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing != nil ? "Update" : "Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving || (weightStr.isEmpty && heightStr.isEmpty && headStr.isEmpty))
            }
        }
        .onAppear {
            if let existing {
                if let date = FormatUtils.parseDate(existing.recordedDate) {
                    recordedDate = date
                }
                if let w = existing.weightKg { weightStr = String(w) }
                if let h = existing.heightCm { heightStr = String(h) }
                if let hc = existing.headCm { headStr = String(hc) }
                notes = existing.notes ?? ""
            }
        }
    }
}

// MARK: - DoctorVisitForm

struct DoctorVisitForm: View {
    let babyId: Int
    var existing: DoctorVisit?
    let onSave: (DoctorVisitRequest) async -> Void

    private let visitTypes = ["checkup", "vaccination", "sick", "emergency", "specialist", "other"]

    @State private var visitDate = Date()
    @State private var visitType = "checkup"
    @State private var doctorName = ""
    @State private var weightStr = ""
    @State private var heightStr = ""
    @State private var headStr = ""
    @State private var hasNextVisit = false
    @State private var nextVisitDate = Date().addingTimeInterval(86400 * 30)
    @State private var notes = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Visit Details") {
                DatePicker("Date", selection: $visitDate, in: ...Date(), displayedComponents: .date)

                Picker("Type", selection: $visitType) {
                    ForEach(visitTypes, id: \.self) { type in
                        Text(type.capitalized).tag(type)
                    }
                }

                TextField("Doctor Name", text: $doctorName)
            }

            Section("Measurements (optional)") {
                HStack {
                    Text("Weight (kg)")
                    Spacer()
                    TextField("e.g. 7.2", text: $weightStr)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }

                HStack {
                    Text("Height (cm)")
                    Spacer()
                    TextField("e.g. 65.5", text: $heightStr)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }

                HStack {
                    Text("Head (cm)")
                    Spacer()
                    TextField("e.g. 42.0", text: $headStr)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 100)
                }
            }

            Section("Follow-up") {
                Toggle("Schedule Next Visit", isOn: $hasNextVisit)
                if hasNextVisit {
                    DatePicker("Next Visit", selection: $nextVisitDate, in: Date()..., displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = DoctorVisitRequest(
                            babyId: babyId,
                            visitDate: FormatUtils.toDateString(visitDate),
                            visitType: visitType,
                            doctorName: doctorName.isEmpty ? nil : doctorName,
                            weightKg: Double(weightStr),
                            heightCm: Double(heightStr),
                            headCm: Double(headStr),
                            nextVisitDate: hasNextVisit ? FormatUtils.toDateString(nextVisitDate) : nil,
                            notes: notes.isEmpty ? nil : notes
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing != nil ? "Update" : "Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving)
            }
        }
        .onAppear {
            if let existing {
                if let date = FormatUtils.parseDate(existing.visitDate) {
                    visitDate = date
                }
                visitType = existing.visitType ?? "checkup"
                doctorName = existing.doctorName ?? ""
                if let w = existing.weightKg { weightStr = String(w) }
                if let h = existing.heightCm { heightStr = String(h) }
                if let hc = existing.headCm { headStr = String(hc) }
                if let next = existing.nextVisitDate, let nextDate = FormatUtils.parseDate(next) {
                    hasNextVisit = true
                    nextVisitDate = nextDate
                }
                notes = existing.notes ?? ""
            }
        }
    }
}

// MARK: - VaccinationForm

struct VaccinationForm: View {
    let babyId: Int
    var existing: Vaccination?
    let onSave: (VaccinationRequest) async -> Void

    private let commonVaccines = [
        "Hepatitis B", "DTaP", "IPV (Polio)", "Hib", "PCV13",
        "RV (Rotavirus)", "MMR", "Varicella", "Hepatitis A",
        "Influenza", "COVID-19", "Other"
    ]

    @State private var vaccineName = ""
    @State private var customVaccineName = ""
    @State private var doseNumber = 1
    @State private var givenDate = Date()
    @State private var administeredBy = ""
    @State private var hasNextDue = false
    @State private var nextDueDate = Date().addingTimeInterval(86400 * 60)
    @State private var notes = ""
    @State private var isSaving = false

    private var effectiveVaccineName: String {
        vaccineName == "Other" ? customVaccineName : vaccineName
    }

    var body: some View {
        Form {
            Section("Vaccine") {
                Picker("Vaccine", selection: $vaccineName) {
                    Text("Select...").tag("")
                    ForEach(commonVaccines, id: \.self) { vaccine in
                        Text(vaccine).tag(vaccine)
                    }
                }

                if vaccineName == "Other" {
                    TextField("Vaccine name", text: $customVaccineName)
                }

                Stepper("Dose #\(doseNumber)", value: $doseNumber, in: 1...10)
            }

            Section("Administration") {
                DatePicker("Date Given", selection: $givenDate, in: ...Date(), displayedComponents: .date)

                TextField("Administered By", text: $administeredBy)
            }

            Section("Follow-up") {
                Toggle("Next Dose Due", isOn: $hasNextDue)
                if hasNextDue {
                    DatePicker("Due Date", selection: $nextDueDate, in: Date()..., displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = VaccinationRequest(
                            babyId: babyId,
                            vaccineName: effectiveVaccineName,
                            doseNumber: doseNumber,
                            givenDate: FormatUtils.toDateString(givenDate),
                            administeredBy: administeredBy.isEmpty ? nil : administeredBy,
                            nextDueDate: hasNextDue ? FormatUtils.toDateString(nextDueDate) : nil,
                            notes: notes.isEmpty ? nil : notes
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing != nil ? "Update" : "Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving || effectiveVaccineName.isEmpty)
            }
        }
        .onAppear {
            if let existing {
                // Check if it matches a common vaccine
                if commonVaccines.contains(existing.vaccineName) {
                    vaccineName = existing.vaccineName
                } else {
                    vaccineName = "Other"
                    customVaccineName = existing.vaccineName
                }
                doseNumber = existing.doseNumber
                if let date = FormatUtils.parseDate(existing.givenDate) {
                    givenDate = date
                }
                administeredBy = existing.administeredBy ?? ""
                if let next = existing.nextDueDate, let nextDate = FormatUtils.parseDate(next) {
                    hasNextDue = true
                    nextDueDate = nextDate
                }
                notes = existing.notes ?? ""
            }
        }
    }
}

// MARK: - AllergyForm

struct AllergyForm: View {
    let babyId: Int
    var existing: Allergy?
    let onSave: (AllergyRequest) async -> Void

    @State private var allergen = ""
    @State private var severity: AllergySeverity = .mild
    @State private var reaction = ""
    @State private var hasDiscoveredDate = false
    @State private var discoveredDate = Date()
    @State private var notes = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Allergy Details") {
                TextField("Allergen (e.g. Peanuts)", text: $allergen)

                Picker("Severity", selection: $severity) {
                    ForEach(AllergySeverity.allCases, id: \.self) { sev in
                        HStack {
                            Circle()
                                .fill(severityColor(sev))
                                .frame(width: 8, height: 8)
                            Text(sev.rawValue.capitalized)
                        }
                        .tag(sev)
                    }
                }

                TextField("Reaction (e.g. Hives, swelling)", text: $reaction)
            }

            Section("Discovery") {
                Toggle("Known Discovery Date", isOn: $hasDiscoveredDate)
                if hasDiscoveredDate {
                    DatePicker("Discovered", selection: $discoveredDate, in: ...Date(), displayedComponents: .date)
                }
            }

            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = AllergyRequest(
                            babyId: babyId,
                            allergen: allergen,
                            severity: severity.rawValue,
                            reaction: reaction.isEmpty ? nil : reaction,
                            discoveredDate: hasDiscoveredDate ? FormatUtils.toDateString(discoveredDate) : nil,
                            notes: notes.isEmpty ? nil : notes
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing != nil ? "Update" : "Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving || allergen.isEmpty)
            }
        }
        .onAppear {
            if let existing {
                allergen = existing.allergen
                severity = existing.severity ?? .mild
                reaction = existing.reaction ?? ""
                if let date = existing.discoveredDate, let parsed = FormatUtils.parseDate(date) {
                    hasDiscoveredDate = true
                    discoveredDate = parsed
                }
                notes = existing.notes ?? ""
            }
        }
    }

    private func severityColor(_ sev: AllergySeverity) -> Color {
        switch sev {
        case .mild: return .green
        case .moderate: return .orange
        case .severe: return .red
        }
    }
}

// MARK: - SickDayForm

struct SickDayForm: View {
    let babyId: Int
    var existing: SickDay?
    let onSave: (SickDayRequest) async -> Void

    private let commonSymptoms = [
        "Fever", "Cough", "Runny Nose", "Congestion", "Vomiting",
        "Diarrhea", "Rash", "Ear Pain", "Fussiness", "Poor Appetite",
        "Lethargy", "Sore Throat"
    ]

    @State private var date = Date()
    @State private var selectedSymptoms: Set<String> = []
    @State private var customSymptom = ""
    @State private var hasTemperature = false
    @State private var temperatureStr = ""
    @State private var notes = ""
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Date") {
                DatePicker("Date", selection: $date, in: ...Date(), displayedComponents: .date)
            }

            Section("Symptoms") {
                // Common symptoms as toggleable tags
                FlowLayout(spacing: 6) {
                    ForEach(commonSymptoms, id: \.self) { symptom in
                        symptomTag(symptom, isSelected: selectedSymptoms.contains(symptom)) {
                            if selectedSymptoms.contains(symptom) {
                                selectedSymptoms.remove(symptom)
                            } else {
                                selectedSymptoms.insert(symptom)
                            }
                        }
                    }
                }
                .padding(.vertical, 4)

                // Custom symptom input
                HStack {
                    TextField("Add custom symptom", text: $customSymptom)
                        .submitLabel(.done)
                        .onSubmit {
                            addCustomSymptom()
                        }
                    if !customSymptom.isEmpty {
                        Button {
                            addCustomSymptom()
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(AppColors.Light.primary)
                        }
                    }
                }

                // Show custom symptoms that were added
                let customOnes = selectedSymptoms.filter { !commonSymptoms.contains($0) }
                if !customOnes.isEmpty {
                    FlowLayout(spacing: 6) {
                        ForEach(Array(customOnes).sorted(), id: \.self) { symptom in
                            symptomTag(symptom, isSelected: true) {
                                selectedSymptoms.remove(symptom)
                            }
                        }
                    }
                }
            }

            Section("Temperature") {
                Toggle("Record Temperature", isOn: $hasTemperature)
                if hasTemperature {
                    HStack {
                        Text("Temperature")
                        Spacer()
                        TextField("e.g. 38.5", text: $temperatureStr)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 80)
                        Text("\u{00B0}C")
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = SickDayRequest(
                            babyId: babyId,
                            date: FormatUtils.toDateString(date),
                            symptoms: Array(selectedSymptoms).sorted(),
                            temperature: hasTemperature ? Double(temperatureStr) : nil,
                            notes: notes.isEmpty ? nil : notes
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing != nil ? "Update" : "Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving || selectedSymptoms.isEmpty)
            }
        }
        .onAppear {
            if let existing {
                if let parsed = FormatUtils.parseDate(existing.date) {
                    date = parsed
                }
                selectedSymptoms = Set(existing.symptoms)
                if let temp = existing.temperature {
                    hasTemperature = true
                    temperatureStr = String(temp)
                }
                notes = existing.notes ?? ""
            }
        }
    }

    private func addCustomSymptom() {
        let trimmed = customSymptom.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        selectedSymptoms.insert(trimmed)
        customSymptom = ""
    }

    private func symptomTag(_ text: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(text)
                .font(.caption)
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    isSelected
                        ? AnyShapeStyle(AppColors.Light.primary)
                        : AnyShapeStyle(Color(.systemGray6))
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - MedicationForm

struct MedicationForm: View {
    let babyId: Int
    var existing: Medication?
    let onSave: (MedicationRequest) async -> Void

    private let frequencyOptions = [
        "Once daily", "Twice daily", "3x daily", "4x daily",
        "Every 4 hours", "Every 6 hours", "Every 8 hours",
        "As needed", "Weekly", "Other"
    ]

    @State private var medicationName = ""
    @State private var dosage = ""
    @State private var frequency = "Once daily"
    @State private var customFrequency = ""
    @State private var startDate = Date()
    @State private var hasEndDate = false
    @State private var endDate = Date().addingTimeInterval(86400 * 7)
    @State private var isActive = true
    @State private var notes = ""
    @State private var isSaving = false

    private var effectiveFrequency: String {
        frequency == "Other" ? customFrequency : frequency
    }

    var body: some View {
        Form {
            Section("Medication Details") {
                TextField("Medication Name", text: $medicationName)

                TextField("Dosage (e.g. 5ml, 400 IU)", text: $dosage)

                Picker("Frequency", selection: $frequency) {
                    ForEach(frequencyOptions, id: \.self) { option in
                        Text(option).tag(option)
                    }
                }

                if frequency == "Other" {
                    TextField("Custom frequency", text: $customFrequency)
                }
            }

            Section("Duration") {
                DatePicker("Start Date", selection: $startDate, displayedComponents: .date)

                Toggle("Has End Date", isOn: $hasEndDate)
                if hasEndDate {
                    DatePicker("End Date", selection: $endDate, in: startDate..., displayedComponents: .date)
                }

                Toggle("Active", isOn: $isActive)
            }

            Section("Notes") {
                TextField("Optional notes", text: $notes, axis: .vertical)
                    .lineLimit(3...6)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = MedicationRequest(
                            babyId: babyId,
                            medicationName: medicationName,
                            dosage: dosage.isEmpty ? nil : dosage,
                            frequency: effectiveFrequency.isEmpty ? nil : effectiveFrequency,
                            startDate: FormatUtils.toDateString(startDate),
                            endDate: hasEndDate ? FormatUtils.toDateString(endDate) : nil,
                            isActive: isActive,
                            notes: notes.isEmpty ? nil : notes
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(existing != nil ? "Update" : "Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving || medicationName.isEmpty)
            }
        }
        .onAppear {
            if let existing {
                medicationName = existing.medicationName
                dosage = existing.dosage ?? ""
                if let freq = existing.frequency {
                    if frequencyOptions.contains(freq) {
                        frequency = freq
                    } else {
                        frequency = "Other"
                        customFrequency = freq
                    }
                }
                if let date = FormatUtils.parseDate(existing.startDate) {
                    startDate = date
                }
                if let end = existing.endDate, let endParsed = FormatUtils.parseDate(end) {
                    hasEndDate = true
                    endDate = endParsed
                }
                isActive = existing.isActive
                notes = existing.notes ?? ""
            }
        }
    }
}

// MARK: - ToothForm

struct ToothForm: View {
    let babyId: Int
    let onSave: (ToothFormRequest) async -> Void

    @State private var selectedPosition: ToothPosition = .lowerLeftCentralIncisor
    @State private var emergedDate = Date()
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Tooth Position") {
                Picker("Position", selection: $selectedPosition) {
                    ForEach(ToothPosition.allCases) { position in
                        Text(position.displayName).tag(position)
                    }
                }
            }

            Section("Date") {
                DatePicker("Emerged Date", selection: $emergedDate, in: ...Date(), displayedComponents: .date)
            }

            Section {
                Button {
                    isSaving = true
                    Task {
                        let request = ToothFormRequest(
                            babyId: babyId,
                            position: selectedPosition.rawValue,
                            emergedDate: FormatUtils.toDateString(emergedDate)
                        )
                        await onSave(request)
                        isSaving = false
                    }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Save")
                                .font(.headline)
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving)
            }
        }
    }
}

struct ToothFormRequest: Encodable {
    let babyId: Int
    let position: String
    let emergedDate: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case position
        case emergedDate = "emerged_date"
    }
}
