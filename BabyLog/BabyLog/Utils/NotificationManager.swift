import Foundation
import UserNotifications
import Observation

@Observable
@MainActor
final class NotificationManager {
    var isAuthorized = false

    func requestPermission() async {
        do {
            isAuthorized = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
        } catch {
            isAuthorized = false
        }
    }

    func checkPermission() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    func scheduleFeedingReminder(babyName: String, intervalHours: Double) {
        let content = UNMutableNotificationContent()
        content.title = "Feeding Reminder"
        content.body = "Time to feed \(babyName)!"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: intervalHours * 3600,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: "feeding-reminder",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    func scheduleSleepReminder(babyName: String, intervalHours: Double) {
        let content = UNMutableNotificationContent()
        content.title = "Sleep Reminder"
        content.body = "\(babyName) may be ready for a nap"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: intervalHours * 3600,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: "sleep-reminder",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    func scheduleMedicationReminder(medicationName: String, frequency: String, hour: Int, minute: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Medication Reminder"
        content.body = "Time for \(medicationName)"
        content.sound = .default

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(
            dateMatching: dateComponents,
            repeats: true
        )

        let request = UNNotificationRequest(
            identifier: "medication-\(medicationName)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    func cancelAllReminders() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    func cancelReminder(identifier: String) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(
            withIdentifiers: [identifier]
        )
    }
}
