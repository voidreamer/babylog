import WidgetKit
import SwiftUI
import AppIntents

struct SleepWidget: Widget {
    let kind: String = "SleepWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyProvider()) { entry in
            SleepWidgetView(entry: entry)
                .containerBackground(WidgetTheme.bg, for: .widget)
        }
        .configurationDisplayName("Sleep")
        .description("Active sleep timer + start/wake button.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct SleepWidgetView: View {
    let entry: BabyEntry

    var body: some View {
        if !entry.isSignedIn {
            SignInPlaceholder(title: "Sleep")
        } else if let start = entry.currentSleepStart {
            sleeping(start: start)
        } else {
            awake()
        }
    }

    @ViewBuilder
    private func sleeping(start: Date) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "moon.zzz.fill")
                Text("Sleeping").font(.headline)
                Spacer()
            }
            .foregroundStyle(WidgetTheme.accent)

            // SwiftUI live timer — counts up from `start` without timeline reloads.
            Text(start, style: .timer)
                .font(.title2.monospacedDigit())

            Spacer(minLength: 4)

            Button(intent: EndSleepIntent()) {
                Label("Wake up", systemImage: "sun.max.fill")
                    .font(.caption)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(WidgetTheme.accent)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    @ViewBuilder
    private func awake() -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "sun.max.fill")
                Text("Awake").font(.headline)
                Spacer()
            }
            .foregroundStyle(WidgetTheme.accent)

            Text("Last nap ended").font(.caption2).foregroundStyle(.secondary)
            RelativeAgo(date: entry.lastSleepEnd, placeholder: "—")
                .font(.title3)

            Spacer(minLength: 4)

            Button(intent: StartSleepIntent()) {
                Label("Start sleep", systemImage: "moon.zzz.fill")
                    .font(.caption)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(WidgetTheme.accent)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}
