import SwiftUI

// MARK: - CaregiverView

struct CaregiverView: View {
    let baby: Baby
    @Bindable var viewModel: SettingsViewModel

    @Environment(\.colorScheme) private var colorScheme

    @State private var newEmail: String = ""
    @State private var newRole: CaregiverRole = .caregiver
    @State private var isAdding: Bool = false
    @State private var showRemoveConfirmation: Bool = false
    @State private var caregiverToRemove: CaregiverEntry?

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    private var caregivers: [CaregiverEntry] {
        baby.sharedWith ?? []
    }

    var body: some View {
        List {
            // MARK: Current Caregivers
            if !caregivers.isEmpty {
                Section {
                    ForEach(caregivers) { caregiver in
                        caregiverRow(caregiver)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    caregiverToRemove = caregiver
                                    showRemoveConfirmation = true
                                } label: {
                                    Label("Remove", systemImage: "trash")
                                }
                            }
                            .contextMenu {
                                ForEach(CaregiverRole.allCases, id: \.self) { role in
                                    Button {
                                        Task {
                                            await viewModel.updateCaregiverRole(
                                                babyId: baby.id,
                                                email: caregiver.email,
                                                role: role.rawValue
                                            )
                                        }
                                    } label: {
                                        HStack {
                                            Text(role.rawValue.capitalized)
                                            if caregiver.role == role {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            }
                    }
                } header: {
                    Text("Current Caregivers")
                } footer: {
                    Text("Swipe left to remove. Long press to change role.")
                        .font(.appBody(size: 12))
                }
            } else {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: Spacing.sm) {
                            Image(systemName: "person.2.slash")
                                .font(.system(size: 32))
                                .foregroundStyle(theme.textMuted)
                            Text("No caregivers yet")
                                .font(.appBody(size: 15))
                                .foregroundStyle(theme.textSecondary)
                            Text("Invite someone to help track \(baby.name)'s activities.")
                                .font(.appBody(size: 13))
                                .foregroundStyle(theme.textMuted)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, Spacing.lg)
                        Spacer()
                    }
                }
            }

            // MARK: Add Caregiver
            Section {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Invite Caregiver")
                        .font(.appBody(size: 15, weight: .semibold))

                    TextField("Email address", text: $newEmail)
                        .font(.appBody(size: 15))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()

                    Picker("Role", selection: $newRole) {
                        ForEach(CaregiverRole.allCases, id: \.self) { role in
                            Text(role.rawValue.capitalized).tag(role)
                        }
                    }
                    .pickerStyle(.segmented)

                    roleDescription
                }

                Button {
                    Task { await addCaregiver() }
                } label: {
                    HStack {
                        Spacer()
                        if isAdding {
                            ProgressView()
                        } else {
                            Label("Send Invitation", systemImage: "paperplane.fill")
                                .font(.appBody(size: 15, weight: .semibold))
                        }
                        Spacer()
                    }
                }
                .disabled(
                    newEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    || !isValidEmail(newEmail)
                    || isAdding
                )
            } header: {
                Text("Add Caregiver")
            }
        }
        .navigationTitle("Caregivers")
        .navigationBarTitleDisplayMode(.inline)
        .confirmDialog(
            isPresented: $showRemoveConfirmation,
            title: "Remove Caregiver",
            message: "Remove \(caregiverToRemove?.email ?? "this caregiver")? They will no longer have access to \(baby.name)'s data.",
            confirmLabel: "Remove"
        ) {
            if let caregiver = caregiverToRemove {
                Task {
                    await viewModel.unshareBaby(babyId: baby.id, email: caregiver.email)
                }
            }
        }
    }

    // MARK: - Caregiver Row

    private func caregiverRow(_ caregiver: CaregiverEntry) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 32))
                .foregroundStyle(theme.textSecondary)

            VStack(alignment: .leading, spacing: 2) {
                Text(caregiver.email)
                    .font(.appBody(size: 15))
                    .lineLimit(1)
            }

            Spacer()

            roleBadge(caregiver.role)
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Role Badge

    private func roleBadge(_ role: CaregiverRole) -> some View {
        Text(role.rawValue.capitalized)
            .font(.appBody(size: 12, weight: .semibold))
            .foregroundStyle(role == .caregiver ? theme.primary : theme.textSecondary)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(
                (role == .caregiver ? theme.primary : theme.textSecondary)
                    .opacity(0.12)
            )
            .clipShape(Capsule())
    }

    // MARK: - Role Description

    @ViewBuilder
    private var roleDescription: some View {
        switch newRole {
        case .viewer:
            Label {
                Text("Viewers can see activities and health data but cannot add or edit entries.")
                    .font(.appBody(size: 12))
                    .foregroundStyle(theme.textMuted)
            } icon: {
                Image(systemName: "eye.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textMuted)
            }
        case .caregiver:
            Label {
                Text("Caregivers can view, add, and edit activities and health records.")
                    .font(.appBody(size: 12))
                    .foregroundStyle(theme.textMuted)
            } icon: {
                Image(systemName: "pencil.circle.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textMuted)
            }
        }
    }

    // MARK: - Actions

    private func addCaregiver() async {
        let email = newEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !email.isEmpty, isValidEmail(email) else { return }

        isAdding = true
        defer { isAdding = false }

        await viewModel.shareBaby(babyId: baby.id, email: email, role: newRole.rawValue)

        if viewModel.error == nil {
            newEmail = ""
        }
    }

    // MARK: - Validation

    private func isValidEmail(_ email: String) -> Bool {
        let pattern = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return email.range(of: pattern, options: .regularExpression) != nil
    }
}

#Preview {
    NavigationStack {
        CaregiverView(
            baby: Baby(
                id: 1,
                name: "Luna",
                birthDate: "2024-06-15",
                gender: "girl",
                profilePhotoUrl: nil,
                bloodType: nil,
                birthplace: nil,
                birthTime: nil,
                isOwner: true,
                sharedWith: [
                    CaregiverEntry(email: "partner@example.com", role: .caregiver),
                    CaregiverEntry(email: "grandma@example.com", role: .viewer),
                ],
                createdAt: nil
            ),
            viewModel: SettingsViewModel()
        )
    }
}
