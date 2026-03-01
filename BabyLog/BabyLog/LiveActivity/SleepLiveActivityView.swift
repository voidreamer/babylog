import ActivityKit
import SwiftUI
import WidgetKit

struct SleepLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SleepActivityAttributes.self) { context in
            // Lock Screen / Banner presentation
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color(hex: "#a78bfa"))
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(context.attributes.babyName)
                            .font(.headline)
                            .foregroundStyle(.white)
                        Text("Started at \(context.attributes.startTime, style: .time)")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.startTime, style: .timer)
                        .font(.system(size: 16, weight: .semibold, design: .monospaced))
                        .foregroundStyle(Color(hex: "#a78bfa"))
                        .frame(width: 56)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Button(intent: EndSleepLiveActivityIntent(sleepId: context.state.sleepId)) {
                        HStack(spacing: 6) {
                            Image(systemName: "stop.fill")
                                .font(.system(size: 10))
                            Text("End Sleep")
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(Color(hex: "#7c3aed"))
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            } compactLeading: {
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(hex: "#a78bfa"))
            } compactTrailing: {
                Text(context.attributes.startTime, style: .timer)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color(hex: "#a78bfa"))
                    .frame(width: 48)
            } minimal: {
                Image(systemName: "moon.zzz.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(hex: "#a78bfa"))
            }
        }
    }

    // MARK: - Lock Screen View

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<SleepActivityAttributes>) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 28))
                .foregroundStyle(Color(hex: "#a78bfa"))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(context.attributes.babyName) is sleeping")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)

                Text(context.attributes.startTime, style: .timer)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color(hex: "#a78bfa"))
            }

            Spacer()

            Button(intent: EndSleepLiveActivityIntent(sleepId: context.state.sleepId)) {
                VStack(spacing: 2) {
                    Image(systemName: "stop.fill")
                        .font(.system(size: 16))
                    Text("End")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(Color(hex: "#7c3aed"))
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(Color(hex: "#1a1625"))
    }
}
