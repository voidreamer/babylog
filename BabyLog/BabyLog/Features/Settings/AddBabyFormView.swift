import SwiftUI

// MARK: - AddBabyFormView

struct AddBabyFormView: View {
    @Bindable var viewModel: SettingsViewModel
    var onComplete: () -> Void

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var birthDate: Date = Date()
    @State private var gender: GenderOption = .other
    @State private var isCreating = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        Form {
            // MARK: Baby Info
            Section {
                HStack {
                    Text("Name")
                        .font(.appBody(size: 15))
                    Spacer()
                    TextField("Baby's name", text: $name)
                        .font(.appBody(size: 15))
                        .multilineTextAlignment(.trailing)
                }

                DatePicker(
                    "Date of Birth",
                    selection: $birthDate,
                    in: ...Date(),
                    displayedComponents: .date
                )
                .font(.appBody(size: 15))

                Picker("Gender", selection: $gender) {
                    ForEach(GenderOption.allCases) { option in
                        Text(option.displayName).tag(option)
                    }
                }
                .font(.appBody(size: 15))
            } header: {
                Text("Baby Information")
            } footer: {
                Text("Only the name is required. You can add more details later in the baby's profile.")
                    .font(.appBody(size: 12))
            }

            // MARK: Preview
            Section {
                HStack(spacing: Spacing.md) {
                    BabyAvatar(
                        name: name.isEmpty ? "?" : name,
                        photoUrl: nil,
                        size: 48
                    )

                    VStack(alignment: .leading, spacing: 4) {
                        Text(name.isEmpty ? "Baby's Name" : name)
                            .font(.appBody(size: 16, weight: .semibold))
                            .foregroundStyle(name.isEmpty ? theme.textMuted : theme.text)

                        HStack(spacing: Spacing.sm) {
                            Text(gender.displayName)
                                .font(.appBody(size: 13))
                                .foregroundStyle(theme.textSecondary)

                            Text("--")
                                .font(.appBody(size: 13))
                                .foregroundStyle(theme.textMuted)

                            Text(formattedBirthDate)
                                .font(.appBody(size: 13))
                                .foregroundStyle(theme.textSecondary)
                        }
                    }
                }
                .padding(.vertical, Spacing.xs)
            } header: {
                Text("Preview")
            }

            // MARK: Create Button
            Section {
                Button {
                    Task { await createBaby() }
                } label: {
                    HStack {
                        Spacer()
                        if isCreating {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Label("Add Baby", systemImage: "plus.circle.fill")
                                .font(.appBody(size: 16, weight: .semibold))
                        }
                        Spacer()
                    }
                }
                .disabled(!isFormValid || isCreating)
                .listRowBackground(isFormValid ? theme.primary : theme.textMuted)
                .foregroundStyle(.white)
            }
        }
        .navigationTitle("Add Baby")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
            }
        }
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.error ?? "")
        }
    }

    // MARK: - Actions

    private func createBaby() async {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        isCreating = true
        defer { isCreating = false }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        let birthDateStr = dateFormatter.string(from: birthDate)

        let baby = await viewModel.createBaby(
            name: trimmedName,
            birthDate: birthDateStr,
            gender: gender.rawValue
        )

        if baby != nil {
            onComplete()
        }
    }

    // MARK: - Helpers

    private var formattedBirthDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: birthDate)
    }
}

#Preview {
    NavigationStack {
        AddBabyFormView(viewModel: SettingsViewModel()) {
            // completion
        }
    }
}
