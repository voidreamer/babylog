import SwiftUI

struct WidgetSettingsView: View {
    @Bindable var viewModel: DashboardViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Widget Type Definitions

    private struct WidgetType: Identifiable {
        let id: String
        let title: String
        let icon: String
        let description: String
        let accentColor: Color
    }

    private var widgetTypes: [WidgetType] {
        [
            WidgetType(
                id: "feeding",
                title: "Feeding",
                icon: "fork.knife",
                description: "Track breast, bottle, and solid feedings",
                accentColor: theme.feeding.main
            ),
            WidgetType(
                id: "diaper",
                title: "Diaper",
                icon: "circle.dotted",
                description: "Log diaper changes and types",
                accentColor: theme.diaper.main
            ),
            WidgetType(
                id: "sleep",
                title: "Sleep",
                icon: "moon.zzz.fill",
                description: "Monitor naps and nighttime sleep",
                accentColor: theme.sleep.main
            ),
            WidgetType(
                id: "pumping",
                title: "Pumping",
                icon: "drop.fill",
                description: "Track pumping sessions and amounts",
                accentColor: theme.pumping.main
            ),
            WidgetType(
                id: "potty",
                title: "Potty",
                icon: "toilet.fill",
                description: "Potty training progress",
                accentColor: theme.potty.main
            ),
            WidgetType(
                id: "tummy",
                title: "Tummy Time",
                icon: "figure.play",
                description: "Track tummy time sessions",
                accentColor: theme.tummy.main
            ),
            WidgetType(
                id: "bath",
                title: "Bath",
                icon: "bathtub.fill",
                description: "Log bath times",
                accentColor: theme.bath.main
            ),
            WidgetType(
                id: "supplement",
                title: "Supplement",
                icon: "pill.fill",
                description: "Vitamins and supplements",
                accentColor: theme.supplementAction
            ),
        ]
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(widgetTypes) { widgetType in
                        widgetToggleRow(widgetType)
                    }
                } header: {
                    Text("Choose which activity widgets appear on your dashboard.")
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textSecondary)
                        .textCase(nil)
                        .padding(.bottom, Spacing.sm)
                } footer: {
                    HStack {
                        Spacer()
                        Text("\(viewModel.visibleWidgets.count) of \(widgetTypes.count) visible")
                            .font(.appBody(size: 12))
                            .foregroundStyle(theme.textMuted)
                        Spacer()
                    }
                    .padding(.top, Spacing.sm)
                }

                Section {
                    Button {
                        enableAll()
                    } label: {
                        HStack {
                            Image(systemName: "eye.fill")
                                .foregroundStyle(theme.primary)
                            Text("Show All")
                                .foregroundStyle(theme.text)
                        }
                    }

                    Button {
                        disableAll()
                    } label: {
                        HStack {
                            Image(systemName: "eye.slash.fill")
                                .foregroundStyle(theme.textMuted)
                            Text("Hide All")
                                .foregroundStyle(theme.text)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Widget Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .font(.appBody(size: 16, weight: .semibold))
                    .foregroundStyle(theme.primary)
                }
            }
        }
        .presentationDragIndicator(.visible)
        .presentationDetents([.medium, .large])
    }

    // MARK: - Widget Toggle Row

    private func widgetToggleRow(_ widgetType: WidgetType) -> some View {
        let isVisible = viewModel.visibleWidgets.contains(widgetType.id)

        return HStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(widgetType.accentColor.opacity(isVisible ? 0.15 : 0.06))
                    .frame(width: 36, height: 36)

                Image(systemName: widgetType.icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(isVisible ? widgetType.accentColor : theme.textMuted)
            }

            // Text
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(widgetType.title)
                    .font(.appBody(size: 15, weight: .semibold))
                    .foregroundStyle(isVisible ? theme.text : theme.textMuted)

                Text(widgetType.description)
                    .font(.appBody(size: 12))
                    .foregroundStyle(theme.textMuted)
                    .lineLimit(1)
            }

            Spacer()

            // Toggle
            Toggle("", isOn: Binding(
                get: { viewModel.visibleWidgets.contains(widgetType.id) },
                set: { _ in viewModel.toggleWidget(widgetType.id) }
            ))
            .tint(widgetType.accentColor)
            .labelsHidden()
        }
        .padding(.vertical, Spacing.xxs)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.toggleWidget(widgetType.id)
            }
        }
    }

    // MARK: - Actions

    private func enableAll() {
        withAnimation {
            viewModel.visibleWidgets = Set(widgetTypes.map(\.id))
        }
    }

    private func disableAll() {
        withAnimation {
            viewModel.visibleWidgets = []
        }
    }
}

// MARK: - Preview

#Preview {
    WidgetSettingsView(viewModel: DashboardViewModel())
}
