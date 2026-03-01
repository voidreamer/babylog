import SwiftUI

// MARK: - AccountSettingsView

struct AccountSettingsView: View {
    @Bindable var viewModel: SettingsViewModel
    @Environment(AppState.self) private var appState
    @Environment(AuthManager.self) private var authManager
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.openURL) private var openURL

    // Delete account flow
    @State private var showDeleteStep1 = false
    @State private var showDeleteStep2 = false
    @State private var deleteConfirmationText = ""

    // Export
    @State private var exportFormat: ExportFormat = .json
    @State private var exportStartDate: Date = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @State private var exportEndDate: Date = Date()
    @State private var isExporting = false
    @State private var showExportSuccess = false
    @State private var exportedData: ExportData?

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        Form {
            // MARK: Account Info
            Section {
                HStack {
                    Label {
                        Text("Email")
                            .font(.appBody(size: 15))
                    } icon: {
                        Image(systemName: "envelope.fill")
                            .foregroundStyle(theme.textSecondary)
                    }
                    Spacer()
                    Text(authManager.currentUser?.email ?? viewModel.userEmail)
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textSecondary)
                        .lineLimit(1)
                }

                HStack {
                    Label {
                        Text("Status")
                            .font(.appBody(size: 15))
                    } icon: {
                        Image(systemName: viewModel.isPremium ? "crown.fill" : "person.fill")
                            .foregroundStyle(viewModel.isPremium ? .yellow : theme.textSecondary)
                    }
                    Spacer()
                    Text(viewModel.isPremium ? "Premium" : "Free")
                        .font(.appBody(size: 14, weight: .semibold))
                        .foregroundStyle(viewModel.isPremium ? .yellow : theme.textMuted)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xxs)
                        .background(
                            (viewModel.isPremium ? Color.yellow : theme.textMuted)
                                .opacity(0.12)
                        )
                        .clipShape(Capsule())
                }
            } header: {
                Text("Account")
            }

            // MARK: Subscription
            Section {
                if viewModel.isPremium {
                    Button {
                        Task { await openBillingPortal() }
                    } label: {
                        Label {
                            Text("Manage Subscription")
                                .font(.appBody(size: 15))
                        } icon: {
                            Image(systemName: "creditcard.fill")
                                .foregroundStyle(theme.primary)
                        }
                    }
                } else {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack {
                            Image(systemName: "crown.fill")
                                .foregroundStyle(.yellow)
                                .font(.system(size: 20))
                            Text("Upgrade to Premium")
                                .font(.appBody(size: 16, weight: .semibold))
                        }

                        Text("Unlock unlimited babies, data export, advanced analytics, and more.")
                            .font(.appBody(size: 13))
                            .foregroundStyle(theme.textSecondary)

                        Button {
                            Task { await openBillingPortal() }
                        } label: {
                            Text("View Plans")
                                .font(.appBody(size: 15, weight: .semibold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, Spacing.sm)
                        }
                        .buttonStyle(.primary)
                    }
                    .padding(.vertical, Spacing.xs)
                }
            } header: {
                Text("Subscription")
            }

            // MARK: Data Export
            Section {
                Picker("Format", selection: $exportFormat) {
                    ForEach(ExportFormat.allCases) { format in
                        Text(format.rawValue).tag(format)
                    }
                }
                .font(.appBody(size: 15))

                DatePicker(
                    "Start Date",
                    selection: $exportStartDate,
                    in: ...exportEndDate,
                    displayedComponents: .date
                )
                .font(.appBody(size: 15))

                DatePicker(
                    "End Date",
                    selection: $exportEndDate,
                    in: exportStartDate...Date(),
                    displayedComponents: .date
                )
                .font(.appBody(size: 15))

                Button {
                    Task { await exportData() }
                } label: {
                    HStack {
                        Spacer()
                        if isExporting {
                            ProgressView()
                        } else {
                            Label("Export Data", systemImage: "square.and.arrow.up")
                                .font(.appBody(size: 15, weight: .semibold))
                        }
                        Spacer()
                    }
                }
                .disabled(isExporting || appState.selectedBaby == nil)
            } header: {
                Text("Data Export")
            } footer: {
                Text("Export your baby's tracking data for the selected date range.")
                    .font(.appBody(size: 12))
            }

            // MARK: Delete Account
            Section {
                Button(role: .destructive) {
                    showDeleteStep1 = true
                } label: {
                    HStack {
                        Spacer()
                        Label("Delete Account", systemImage: "trash.fill")
                            .font(.appBody(size: 15, weight: .medium))
                        Spacer()
                    }
                }
            } footer: {
                Text("Permanently delete your account and all associated data. This action cannot be undone.")
                    .font(.appBody(size: 12))
            }
        }
        .navigationTitle("Account & Data")
        .navigationBarTitleDisplayMode(.inline)
        // Delete Step 1
        .alert("Delete Account?", isPresented: $showDeleteStep1) {
            Button("Cancel", role: .cancel) { }
            Button("Continue", role: .destructive) {
                showDeleteStep2 = true
            }
        } message: {
            Text("This will permanently delete your account, all babies, and all tracking data. Are you absolutely sure?")
        }
        // Delete Step 2 (double confirmation)
        .alert("Final Confirmation", isPresented: $showDeleteStep2) {
            TextField("Type DELETE to confirm", text: $deleteConfirmationText)
            Button("Cancel", role: .cancel) {
                deleteConfirmationText = ""
            }
            Button("Delete Forever", role: .destructive) {
                guard deleteConfirmationText.uppercased() == "DELETE" else {
                    deleteConfirmationText = ""
                    return
                }
                Task {
                    await viewModel.deleteAccount()
                    if viewModel.error == nil {
                        authManager.signOut()
                    }
                    deleteConfirmationText = ""
                }
            }
        } message: {
            Text("Type DELETE to permanently delete your account. This cannot be undone.")
        }
        // Export success
        .alert("Export Complete", isPresented: $showExportSuccess) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("Your data has been exported successfully.")
        }
    }

    // MARK: - Actions

    private func openBillingPortal() async {
        if let url = await viewModel.openBillingPortal() {
            openURL(url)
        }
    }

    private func exportData() async {
        guard let babyId = appState.selectedBaby?.id else { return }

        isExporting = true
        defer { isExporting = false }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")

        let startStr = dateFormatter.string(from: exportStartDate)
        let endStr = dateFormatter.string(from: exportEndDate)

        let data = await viewModel.exportData(
            babyId: babyId,
            format: exportFormat,
            startDate: startStr,
            endDate: endStr
        )

        if data != nil {
            exportedData = data
            showExportSuccess = true
            shareExportedData(data)
        }
    }

    private func shareExportedData(_ data: ExportData?) {
        guard let data = data,
              let jsonData = try? JSONEncoder().encode(data),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        let fileName = "babylog-export-\(Date().ISO8601Format()).json"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        do {
            try jsonString.write(to: tempURL, atomically: true, encoding: .utf8)

            let activityVC = UIActivityViewController(
                activityItems: [tempURL],
                applicationActivities: nil
            )

            if let windowScene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene })
                .first(where: { $0.activationState == .foregroundActive }),
               let rootVC = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController {
                rootVC.present(activityVC, animated: true)
            }
        } catch {
            viewModel.error = "Failed to prepare export file."
        }
    }
}

#Preview {
    NavigationStack {
        AccountSettingsView(viewModel: SettingsViewModel())
            .environment(AppState())
            .environment(AuthManager())
    }
}
