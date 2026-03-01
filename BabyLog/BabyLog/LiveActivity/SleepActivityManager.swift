import ActivityKit
import Foundation

enum SleepActivityManager {

    @discardableResult
    static func startActivity(babyName: String, startTime: Date, sleepId: Int) -> Activity<SleepActivityAttributes>? {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

        let attributes = SleepActivityAttributes(babyName: babyName, startTime: startTime)
        let state = SleepActivityAttributes.ContentState(sleepId: sleepId)
        let content = ActivityContent(state: state, staleDate: nil)

        do {
            return try Activity.request(attributes: attributes, content: content, pushType: nil)
        } catch {
            print("[SleepActivityManager] Failed to start activity: \(error)")
            return nil
        }
    }

    static func endActivity() {
        let state = SleepActivityAttributes.ContentState(sleepId: 0)
        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            for activity in Activity<SleepActivityAttributes>.activities {
                await activity.end(content, dismissalPolicy: .immediate)
            }
        }
    }

    static func endAllActivities() {
        let state = SleepActivityAttributes.ContentState(sleepId: 0)
        let content = ActivityContent(state: state, staleDate: nil)

        Task {
            for activity in Activity<SleepActivityAttributes>.activities {
                await activity.end(content, dismissalPolicy: .immediate)
            }
        }
    }

    /// Checks if there's already a running sleep Live Activity.
    static var hasRunningActivity: Bool {
        !Activity<SleepActivityAttributes>.activities.isEmpty
    }
}
