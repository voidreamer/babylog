import SwiftUI
import UserNotifications

// MARK: - Reminder Interval

enum ReminderInterval: Int, CaseIterable, Identifiable {
    case twoHours = 2
    case threeHours = 3
    case fourHours = 4

    var id: Int { rawValue }

    var displayName: String {
        "Every \(rawValue)h"
    }

    var description: String {
        "Every \(rawValue) hours"
    }
}

// MARK: - NotificationSettingsView

struct NotificationSettingsView: View {
    @Bindable var viewModel: SettingsViewModel
    @Environment(\.colorScheme) private var colorScheme

    @State private var systemNotificationsEnabled = false
    @State private var hasCheckedPermission = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    private var prefs: NotificationPreferences {
        get { viewModel.notificationPreferences }
    }

    var body: some View {
        Form {
            // MARK: Master Toggle
            Section {
                Toggle(isOn: Binding(
                    get: { viewModel.notificationPreferences.enabled },
                    set: { newValue in
                        viewModel.notificationPreferences.enabled = newValue
                        viewModel.saveNotificationPreferences()
                        if newValue {
                            requestNotificationPermission()
                        }
                    }
                )) {
                    Label {
                        Text("Enable Notifications")
                            .font(.appBody(size: 15, weight: .medium))
                    } icon: {
                        Image(systemName: "bell.fill")
                            .foregroundStyle(.orange)
                    }
                }

                if !systemNotificationsEnabled && hasCheckedPermission && viewModel.notificationPreferences.enabled {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                            .font(.system(size: 14))
                        Text("Notifications are disabled in System Settings. Tap to open Settings.")
                            .font(.appBody(size: 13))
                            .foregroundStyle(theme.textSecondary)
                    }
                    .onTapGesture {
                        openSystemSettings()
                    }
                }
            } footer: {
                Text("Receive reminders for feeding schedules, diaper changes, and more.")
                    .font(.appBody(size: 12))
            }

            // MARK: Activity Reminders
            if viewModel.notificationPreferences.enabled {
                Section {
                    Toggle(isOn: Binding(
                        get: { viewModel.notificationPreferences.feedingReminders },
                        set: { newValue in
                            viewModel.notificationPreferences.feedingReminders = newValue
                            viewModel.saveNotificationPreferences()
                        }
                    )) {
                        Label {
                            Text("Feeding Reminders")
                                .font(.appBody(size: 15))
                        } icon: {
                            Image(systemName: "cup.and.saucer.fill")
                                .foregroundStyle(AppColors.Light.feeding)
                        }
                    }

                    Toggle(isOn: Binding(
                        get: { viewModel.notificationPreferences.diaperReminders },
                        set: { newValue in
                            viewModel.notificationPreferences.diaperReminders = newValue
                            viewModel.saveNotificationPreferences()
                        }
                    )) {
                        Label {
                            Text("Diaper Reminders")
                                .font(.appBody(size: 15))
                        } icon: {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .foregroundStyle(AppColors.Light.diaper)
                        }
                    }

                    Toggle(isOn: Binding(
                        get: { viewModel.notificationPreferences.sleepReminders },
                        set: { newValue in
                            viewModel.notificationPreferences.sleepReminders = newValue
                            viewModel.saveNotificationPreferences()
                        }
                    )) {
                        Label {
                            Text("Sleep Reminders")
                                .font(.appBody(size: 15))
                        } icon: {
                            Image(systemName: "moon.fill")
                                .foregroundStyle(AppColors.Light.sleep)
                        }
                    }

                    Toggle(isOn: Binding(
                        get: { viewModel.notificationPreferences.medicationReminders },
                        set: { newValue in
                            viewModel.notificationPreferences.medicationReminders = newValue
                            viewModel.saveNotificationPreferences()
                        }
                    )) {
                        Label {
                            Text("Medication Reminders")
                                .font(.appBody(size: 15))
                        } icon: {
                            Image(systemName: "pills.fill")
                                .foregroundStyle(.red)
                        }
                    }
                } header: {
                    Text("Activity Reminders")
                }

                // MARK: Reminder Interval
                Section {
                    Picker("Reminder Interval", selection: Binding(
                        get: {
                            ReminderInterval(rawValue: viewModel.notificationPreferences.reminderIntervalHours) ?? .threeHours
                        },
                        set: { newValue in
                            viewModel.notificationPreferences.reminderIntervalHours = newValue.rawValue
                            viewModel.saveNotificationPreferences()
                        }
                    )) {
                        ForEach(ReminderInterval.allCases) { interval in
                            Text(interval.description).tag(interval)
                        }
                    }
                    .font(.appBody(size: 15))
                } header: {
                    Text("Timing")
                } footer: {
                    Text("How often to remind you if an activity hasn't been logged.")
                        .font(.appBody(size: 12))
                }
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            checkNotificationPermission()
        }
    }

    // MARK: - Permission Helpers

    private func checkNotificationPermission() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                systemNotificationsEnabled = settings.authorizationStatus == .authorized
                hasCheckedPermission = true
            }
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                systemNotificationsEnabled = granted
            }
        }
    }

    private func openSystemSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView(viewModel: SettingsViewModel())
    }
}
