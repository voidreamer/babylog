import WidgetKit
import SwiftUI

@main
struct HeyBubWidgetsBundle: WidgetBundle {
    var body: some Widget {
        FeedingWidget()
        DiaperWidget()
        SleepWidget()
    }
}
