import WidgetKit
import SwiftUI

@main
struct BabyLogWidgetsBundle: WidgetBundle {
    var body: some Widget {
        BabyStatusWidget()
        QuickLogWidget()
        SleepPressureWidget()
        NextNapWidget()
        StatusInlineWidget()
        SleepLiveActivity()
    }
}
