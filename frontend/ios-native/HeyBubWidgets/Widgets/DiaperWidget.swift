import WidgetKit
import SwiftUI
import AppIntents

struct DiaperWidget: Widget {
    let kind: String = "DiaperWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyProvider()) { entry in
            DiaperWidgetView(entry: entry)
                .containerBackground(WidgetTheme.bg, for: .widget)
        }
        .configurationDisplayName("Diaper")
        .description("Last diaper + quick log buttons.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct DiaperWidgetView: View {
    let entry: BabyEntry

    var body: some View {
        if !entry.isSignedIn {
            SignInPlaceholder(title: "Diaper")
        } else {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "drop.fill")
                    Text("Diaper").font(.headline)
                    Spacer()
                }
                .foregroundStyle(WidgetTheme.accent)

                Text("Last diaper").font(.caption2).foregroundStyle(.secondary)
                RelativeAgo(date: entry.lastDiaperAt, placeholder: "—")
                    .font(.title3)

                Spacer(minLength: 4)

                HStack(spacing: 6) {
                    Button(intent: LogDiaperIntent(typeRaw: "pee")) {
                        Text("Wet").font(.caption).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)

                    Button(intent: LogDiaperIntent(typeRaw: "poo")) {
                        Text("Dirty").font(.caption).frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(WidgetTheme.accent)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}
