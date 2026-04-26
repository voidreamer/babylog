import WidgetKit
import SwiftUI
import AppIntents

struct FeedingWidget: Widget {
    let kind: String = "FeedingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyProvider()) { entry in
            FeedingWidgetView(entry: entry)
                .containerBackground(WidgetTheme.bg, for: .widget)
        }
        .configurationDisplayName("Feeding")
        .description("Last feeding + one-tap log.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct FeedingWidgetView: View {
    let entry: BabyEntry

    var body: some View {
        if !entry.isSignedIn {
            SignInPlaceholder(title: "Feeding")
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "fork.knife")
                    Text("Feeding").font(.headline)
                    Spacer()
                }
                .foregroundStyle(WidgetTheme.accent)

                Text("Last feeding")
                    .font(.caption2).foregroundStyle(.secondary)
                RelativeAgo(date: entry.lastFeedingAt, placeholder: "—")
                    .font(.title3)

                Spacer(minLength: 4)

                Button(intent: LogQuickBottleIntent()) {
                    Label("Log 120 ml bottle", systemImage: "plus.circle.fill")
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
}
