import SwiftUI

// MARK: - SettingsView

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @Environment(AuthManager.self) private var authManager
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    @State private var viewModel = SettingsViewModel()
    @State private var showSignOutConfirmation = false
    @State private var showAddBabySheet = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        List {
            // MARK: Baby Profile Section
            babyProfileSection

            // MARK: Caregivers Section
            caregiversSection

            // MARK: Notifications Section
            notificationsSection

            // MARK: Appearance Section
            appearanceSection

            // MARK: Account Section
            accountSection

            // MARK: About Section
            aboutSection

            // MARK: Sign Out
            signOutSection
        }
        .navigationTitle("Settings")
        .alert("Error", isPresented: .init(
            get: { viewModel.error != nil },
            set: { if !$0 { viewModel.error = nil } }
        )) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(viewModel.error ?? "")
        }
        .confirmDialog(
            isPresented: $showSignOutConfirmation,
            title: "Sign Out",
            message: "Are you sure you want to sign out? You will need to sign in again to access your data.",
            confirmLabel: "Sign Out"
        ) {
            authManager.signOut()
        }
        .sheet(isPresented: $showAddBabySheet) {
            NavigationStack {
                AddBabyFormView(viewModel: viewModel) {
                    showAddBabySheet = false
                    Task {
                        await appState.loadBabies()
                    }
                }
            }
        }
        .task {
            viewModel.apiClient = appState.apiClient
            await viewModel.loadSettings()
        }
    }

    // MARK: - Baby Profile Section

    @ViewBuilder
    private var babyProfileSection: some View {
        Section {
            if let baby = appState.selectedBaby {
                NavigationLink {
                    BabyProfileView(baby: baby, viewModel: viewModel)
                } label: {
                    HStack(spacing: Spacing.md) {
                        BabyAvatar(
                            name: baby.name,
                            photoUrl: baby.profilePhotoUrl,
                            size: 44
                        )
                        VStack(alignment: .leading, spacing: 2) {
                            Text(baby.name)
                                .font(.appBody(size: 16, weight: .semibold))
                            if let birthDate = baby.birthDate {
                                Text(formatDisplayDate(birthDate))
                                    .font(.appBody(size: 13))
                                    .foregroundStyle(theme.textSecondary)
                            }
                        }
                    }
                    .padding(.vertical, Spacing.xs)
                }
            }

            // Other babies
            ForEach(appState.babies.filter { $0.id != appState.selectedBaby?.id }) { baby in
                Button {
                    appState.selectBaby(baby)
                } label: {
                    HStack(spacing: Spacing.md) {
                        BabyAvatar(
                            name: baby.name,
                            photoUrl: baby.profilePhotoUrl,
                            size: 36
                        )
                        Text(baby.name)
                            .font(.appBody(size: 15))
                            .foregroundStyle(theme.text)
                        Spacer()
                        Text("Switch")
                            .font(.appBody(size: 13))
                            .foregroundStyle(theme.textMuted)
                    }
                }
            }

            Button {
                showAddBabySheet = true
            } label: {
                Label("Add Baby", systemImage: "plus.circle.fill")
                    .font(.appBody(size: 15, weight: .medium))
            }
        } header: {
            Text("Baby Profile")
        }
    }

    // MARK: - Caregivers Section

    @ViewBuilder
    private var caregiversSection: some View {
        if let baby = appState.selectedBaby, baby.isOwner == true {
            Section {
                NavigationLink {
                    CaregiverView(baby: baby, viewModel: viewModel)
                } label: {
                    Label {
                        HStack {
                            Text("Manage Caregivers")
                                .font(.appBody(size: 15))
                            Spacer()
                            if let count = baby.sharedWith?.count, count > 0 {
                                Text("\(count)")
                                    .font(.appBody(size: 13))
                                    .foregroundStyle(theme.textMuted)
                            }
                        }
                    } icon: {
                        Image(systemName: "person.2.fill")
                            .foregroundStyle(theme.primary)
                    }
                }
            } header: {
                Text("Caregivers")
            }
        }
    }

    // MARK: - Notifications Section

    @ViewBuilder
    private var notificationsSection: some View {
        Section {
            NavigationLink {
                NotificationSettingsView(viewModel: viewModel)
            } label: {
                Label {
                    Text("Notifications")
                        .font(.appBody(size: 15))
                } icon: {
                    Image(systemName: "bell.fill")
                        .foregroundStyle(.orange)
                }
            }
        } header: {
            Text("Notifications")
        }
    }

    // MARK: - Appearance Section

    @ViewBuilder
    private var appearanceSection: some View {
        Section {
            NavigationLink {
                AppearanceSettingsView(viewModel: viewModel)
            } label: {
                Label {
                    Text("Appearance")
                        .font(.appBody(size: 15))
                } icon: {
                    Image(systemName: "paintbrush.fill")
                        .foregroundStyle(.purple)
                }
            }
        } header: {
            Text("Appearance")
        }
    }

    // MARK: - Account Section

    @ViewBuilder
    private var accountSection: some View {
        Section {
            NavigationLink {
                AccountSettingsView(viewModel: viewModel)
            } label: {
                Label {
                    Text("Account & Data")
                        .font(.appBody(size: 15))
                } icon: {
                    Image(systemName: "person.crop.circle.fill")
                        .foregroundStyle(.blue)
                }
            }
        } header: {
            Text("Account")
        }
    }

    // MARK: - About Section

    @ViewBuilder
    private var aboutSection: some View {
        Section {
            HStack {
                Label {
                    Text("Version")
                        .font(.appBody(size: 15))
                } icon: {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(theme.textMuted)
                }
                Spacer()
                Text(appVersion)
                    .font(.appBody(size: 14))
                    .foregroundStyle(theme.textSecondary)
            }

            if let privacyURL = URL(string: "https://heybub.app/privacy") {
                Link(destination: privacyURL) {
                    Label {
                        Text("Privacy Policy")
                            .font(.appBody(size: 15))
                            .foregroundStyle(theme.text)
                    } icon: {
                        Image(systemName: "hand.raised.fill")
                            .foregroundStyle(.green)
                    }
                }
            }

            if let termsURL = URL(string: "https://heybub.app/terms") {
                Link(destination: termsURL) {
                    Label {
                        Text("Terms of Service")
                            .font(.appBody(size: 15))
                            .foregroundStyle(theme.text)
                    } icon: {
                        Image(systemName: "doc.text.fill")
                            .foregroundStyle(theme.textMuted)
                    }
                }
            }
        } header: {
            Text("About")
        }
    }

    // MARK: - Sign Out Section

    @ViewBuilder
    private var signOutSection: some View {
        Section {
            Button(role: .destructive) {
                showSignOutConfirmation = true
            } label: {
                HStack {
                    Spacer()
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        .font(.appBody(size: 16, weight: .semibold))
                    Spacer()
                }
            }
        }
    }

    // MARK: - Helpers

    private var appVersion: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "\(version) (\(build))"
    }

    private func formatDisplayDate(_ dateString: String) -> String {
        let inputFormatter = DateFormatter()
        inputFormatter.dateFormat = "yyyy-MM-dd"
        inputFormatter.locale = Locale(identifier: "en_US_POSIX")

        guard let date = inputFormatter.date(from: dateString) else {
            return dateString
        }

        let outputFormatter = DateFormatter()
        outputFormatter.dateStyle = .medium
        outputFormatter.timeStyle = .none
        return outputFormatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .environment(AppState())
            .environment(AuthManager())
            .environment(ThemeManager())
    }
}
