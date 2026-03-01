import SwiftUI
import PhotosUI

// MARK: - Gender Option

enum GenderOption: String, CaseIterable, Identifiable {
    case boy
    case girl
    case other

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .boy:   return "Boy"
        case .girl:  return "Girl"
        case .other: return "Other"
        }
    }

    var iconName: String {
        switch self {
        case .boy:   return "figure.child"
        case .girl:  return "figure.child"
        case .other: return "figure.child"
        }
    }
}

// MARK: - Blood Type Option

enum BloodTypeOption: String, CaseIterable, Identifiable {
    case unknown = ""
    case aPositive = "A+"
    case aNegative = "A-"
    case bPositive = "B+"
    case bNegative = "B-"
    case abPositive = "AB+"
    case abNegative = "AB-"
    case oPositive = "O+"
    case oNegative = "O-"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .unknown: return "Unknown"
        default:       return rawValue
        }
    }
}

// MARK: - BabyProfileView

struct BabyProfileView: View {
    let baby: Baby
    @Bindable var viewModel: SettingsViewModel

    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    // MARK: Form State

    @State private var name: String = ""
    @State private var birthDate: Date = Date()
    @State private var hasBirthDate: Bool = false
    @State private var gender: GenderOption = .other
    @State private var bloodType: BloodTypeOption = .unknown
    @State private var birthplace: String = ""
    @State private var birthTime: Date = Date()
    @State private var hasBirthTime: Bool = false

    // Photo
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var selectedPhotoData: Data?

    // Dialogs
    @State private var showDeleteConfirmation = false
    @State private var showSaveSuccess = false
    @State private var isSaving = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        Form {
            // MARK: Profile Photo
            Section {
                HStack {
                    Spacer()
                    VStack(spacing: Spacing.sm) {
                        if let photoData = selectedPhotoData,
                           let uiImage = UIImage(data: photoData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 80, height: 80)
                                .clipShape(Circle())
                        } else {
                            BabyAvatar(
                                name: name.isEmpty ? baby.name : name,
                                photoUrl: baby.profilePhotoUrl,
                                size: 80
                            )
                        }

                        PhotosPicker(
                            selection: $selectedPhotoItem,
                            matching: .images
                        ) {
                            Text("Change Photo")
                                .font(.appBody(size: 14, weight: .medium))
                                .foregroundStyle(theme.primary)
                        }
                    }
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }

            // MARK: Basic Info
            Section {
                HStack {
                    Text("Name")
                        .font(.appBody(size: 15))
                    Spacer()
                    TextField("Baby's name", text: $name)
                        .font(.appBody(size: 15))
                        .multilineTextAlignment(.trailing)
                }

                Toggle("Birth Date", isOn: $hasBirthDate)
                    .font(.appBody(size: 15))

                if hasBirthDate {
                    DatePicker(
                        "Date of Birth",
                        selection: $birthDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .font(.appBody(size: 15))
                }

                Picker("Gender", selection: $gender) {
                    ForEach(GenderOption.allCases) { option in
                        Text(option.displayName).tag(option)
                    }
                }
                .font(.appBody(size: 15))
            } header: {
                Text("Basic Information")
            }

            // MARK: Additional Info
            Section {
                Picker("Blood Type", selection: $bloodType) {
                    ForEach(BloodTypeOption.allCases) { option in
                        Text(option.displayName).tag(option)
                    }
                }
                .font(.appBody(size: 15))

                HStack {
                    Text("Birthplace")
                        .font(.appBody(size: 15))
                    Spacer()
                    TextField("City, Hospital", text: $birthplace)
                        .font(.appBody(size: 15))
                        .multilineTextAlignment(.trailing)
                }

                Toggle("Birth Time", isOn: $hasBirthTime)
                    .font(.appBody(size: 15))

                if hasBirthTime {
                    DatePicker(
                        "Time of Birth",
                        selection: $birthTime,
                        displayedComponents: .hourAndMinute
                    )
                    .font(.appBody(size: 15))
                }
            } header: {
                Text("Additional Details")
            }

            // MARK: Save Button
            Section {
                Button {
                    Task { await saveProfile() }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Save Changes")
                                .font(.appBody(size: 16, weight: .semibold))
                        }
                        Spacer()
                    }
                }
                .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)
                .listRowBackground(
                    name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? theme.textMuted
                        : theme.primary
                )
                .foregroundStyle(.white)
            }

            // MARK: Delete Baby
            if baby.isOwner == true {
                Section {
                    Button(role: .destructive) {
                        showDeleteConfirmation = true
                    } label: {
                        HStack {
                            Spacer()
                            Label("Delete Baby", systemImage: "trash.fill")
                                .font(.appBody(size: 15, weight: .medium))
                            Spacer()
                        }
                    }
                } footer: {
                    Text("This will permanently delete all data associated with this baby. This action cannot be undone.")
                        .font(.appBody(size: 12))
                }
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .confirmDialog(
            isPresented: $showDeleteConfirmation,
            title: "Delete \(baby.name)?",
            message: "All tracking data, health records, and growth measurements will be permanently deleted. This cannot be undone.",
            confirmLabel: "Delete"
        ) {
            Task {
                await viewModel.deleteBaby(id: baby.id)
                await appState.loadBabies()
                dismiss()
            }
        }
        .alert("Saved", isPresented: $showSaveSuccess) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Baby profile updated successfully.")
        }
        .onChange(of: selectedPhotoItem) { _, newItem in
            Task {
                if let data = try? await newItem?.loadTransferable(type: Data.self) {
                    selectedPhotoData = data
                }
            }
        }
        .onAppear {
            populateForm()
        }
    }

    // MARK: - Populate Form

    private func populateForm() {
        name = baby.name

        if let dateStr = baby.birthDate {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            if let date = formatter.date(from: dateStr) {
                birthDate = date
                hasBirthDate = true
            }
        }

        if let genderStr = baby.gender,
           let genderOpt = GenderOption(rawValue: genderStr.lowercased()) {
            gender = genderOpt
        }

        if let bt = baby.bloodType,
           let btOpt = BloodTypeOption(rawValue: bt) {
            bloodType = btOpt
        }

        birthplace = baby.birthplace ?? ""

        if let timeStr = baby.birthTime {
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"
            formatter.locale = Locale(identifier: "en_US_POSIX")
            if let time = formatter.date(from: timeStr) {
                birthTime = time
                hasBirthTime = true
            }
        }
    }

    // MARK: - Save

    private func saveProfile() async {
        isSaving = true
        defer { isSaving = false }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        timeFormatter.locale = Locale(identifier: "en_US_POSIX")

        await viewModel.updateBabyProfile(
            babyId: baby.id,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            birthDate: hasBirthDate ? dateFormatter.string(from: birthDate) : nil,
            gender: gender.rawValue,
            bloodType: bloodType.rawValue.isEmpty ? nil : bloodType.rawValue,
            birthplace: birthplace.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : birthplace.trimmingCharacters(in: .whitespacesAndNewlines),
            birthTime: hasBirthTime ? timeFormatter.string(from: birthTime) : nil
        )

        if viewModel.error == nil {
            await appState.loadBabies()
            showSaveSuccess = true
        }
    }
}

#Preview {
    NavigationStack {
        BabyProfileView(
            baby: Baby(
                id: 1,
                name: "Luna",
                birthDate: "2024-06-15",
                gender: "girl",
                profilePhotoUrl: nil,
                bloodType: "A+",
                birthplace: "Portland, OR",
                birthTime: "14:30",
                isOwner: true,
                sharedWith: [],
                createdAt: nil
            ),
            viewModel: SettingsViewModel()
        )
        .environment(AppState())
    }
}
