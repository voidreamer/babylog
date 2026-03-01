import ActivityKit
import Foundation

struct SleepActivityAttributes: ActivityAttributes {
    let babyName: String
    let startTime: Date

    struct ContentState: Codable, Hashable {
        let sleepId: Int
    }
}
