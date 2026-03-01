import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme

    @State private var viewModel = DashboardViewModel()
    @State private var showWidgetSettings = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Widget Definitions

    private struct WidgetDefinition: Identifiable {
        let id: String
        let title: String
        let icon: String
        let colorSet: (ResolvedTheme) -> ActivityColorSet
    }

    private let allWidgets: [WidgetDefinition] = [
        WidgetDefinition(id: "feeding", title: "Feeding", icon: "fork.knife", colorSet: \.feeding),
        WidgetDefinition(id: "diaper", title: "Diaper", icon: "circle.dotted", colorSet: \.diaper),
        WidgetDefinition(id: "sleep", title: "Sleep", icon: "moon.zzz.fill", colorSet: \.sleep),
        WidgetDefinition(id: "pumping", title: "Pumping", icon: "drop.fill", colorSet: \.pumping),
        WidgetDefinition(id: "potty", title: "Potty", icon: "toilet.fill", colorSet: \.potty),
        WidgetDefinition(id: "tummy", title: "Tummy Time", icon: "figure.play", colorSet: \.tummy),
        WidgetDefinition(id: "bath", title: "Bath", icon: "bathtub.fill", colorSet: \.bath),
        WidgetDefinition(id: "supplement", title: "Supplement", icon: "pill.fill", colorSet: { _ in
            ActivityColorSet(
                main: AppColors.Light.supplementAction,
                bg: AppColors.Light.feedingBg,
                text: AppColors.Light.feedingText
            )
        }),
    ]

    private var visibleWidgetDefinitions: [WidgetDefinition] {
        allWidgets.filter { viewModel.visibleWidgets.contains($0.id) }
    }

    private let columns = [
        GridItem(.flexible(), spacing: Spacing.md),
        GridItem(.flexible(), spacing: Spacing.md),
    ]

    // MARK: - Body

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: Spacing.xl) {
                    // Greeting
                    if let baby = appState.selectedBaby {
                        BabyGreetingView(baby: baby)
                            .padding(.horizontal, Spacing.lg)
                    }

                    // Daily Summary
                    if let summary = viewModel.dashboardData?.dailySummary {
                        DailySummaryView(summary: summary)
                    }

                    // Active Sleep Banner
                    if let currentSleep = viewModel.dashboardData?.currentSleep {
                        activeSleepBanner(currentSleep)
                            .padding(.horizontal, Spacing.lg)
                    }

                    // Activity Widget Grid
                    if !visibleWidgetDefinitions.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("Activity")
                                .font(.appHeading(size: 18, weight: .semibold))
                                .foregroundStyle(theme.text)
                                .padding(.horizontal, Spacing.lg)

                            LazyVGrid(columns: columns, spacing: Spacing.md) {
                                ForEach(visibleWidgetDefinitions) { widget in
                                    activityWidgetCard(for: widget)
                                }
                            }
                            .padding(.horizontal, Spacing.lg)
                        }
                    }

                    // Upcoming
                    if !viewModel.upcomingItems.isEmpty {
                        ComingUpView(items: viewModel.upcomingItems)
                            .padding(.horizontal, Spacing.lg)
                    }

                    Spacer(minLength: Spacing.xxxl)
                }
                .padding(.top, Spacing.md)
            }
            .refreshable {
                await refreshData()
            }

            // Toast overlay
            if let toast = viewModel.quickLogSuccess {
                toastView(message: toast)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .animation(.spring(duration: 0.3), value: viewModel.quickLogSuccess)
                    .padding(.bottom, Spacing.xl)
            }
        }
        .background(theme.background.ignoresSafeArea())
        .navigationTitle("Dashboard")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                babySelectorMenu
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showWidgetSettings = true
                } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                }
            }
        }
        .sheet(isPresented: $showWidgetSettings) {
            WidgetSettingsView(viewModel: viewModel)
        }
        .overlay {
            if viewModel.isLoading && viewModel.dashboardData == nil {
                LoadingView(message: "Loading dashboard...")
            }
        }
        .task(id: appState.selectedBaby?.id) {
            guard let baby = appState.selectedBaby else { return }
            viewModel = DashboardViewModel(apiClient: appState.apiClient)
            await refreshData()
        }
    }

    // MARK: - Toast View

    private func toastView(message: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: message.contains("Failed") ? "xmark.circle.fill" : "checkmark.circle.fill")
                .foregroundStyle(message.contains("Failed") ? theme.danger : theme.success)
            Text(message)
                .font(.appBody(size: 14, weight: .medium))
                .foregroundStyle(theme.text)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.md)
        .background(
            Capsule()
                .fill(theme.surface)
                .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
        )
    }

    // MARK: - Baby Selector Menu

    private var babySelectorMenu: some View {
        Menu {
            ForEach(appState.babies) { baby in
                Button {
                    appState.selectBaby(baby)
                } label: {
                    HStack {
                        Text(baby.name)
                        if baby.id == appState.selectedBaby?.id {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: Spacing.xs) {
                babyAvatar(for: appState.selectedBaby)
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
            }
        }
    }

    // MARK: - Baby Avatar

    private func babyAvatar(for baby: Baby?) -> some View {
        ZStack {
            Circle()
                .fill(theme.primaryLight.opacity(0.5))
                .frame(width: 32, height: 32)

            Text(baby?.name.prefix(1).uppercased() ?? "?")
                .font(.appHeading(size: 14, weight: .bold))
                .foregroundStyle(theme.primary)
        }
    }

    // MARK: - Active Sleep Banner

    private func activeSleepBanner(_ sleep: SleepRecord) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 20))
                .foregroundStyle(theme.sleep.main)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text("Currently Sleeping")
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)

                Text("Started \(formatTimeAgo(from: sleep.startTime))")
                    .font(.appBody(size: 12))
                    .foregroundStyle(theme.textSecondary)
            }

            Spacer()

            // End Sleep button
            Button {
                guard let babyId = appState.selectedBaby?.id else { return }
                Task {
                    await viewModel.quickLogEndSleep(babyId: babyId)
                }
            } label: {
                Text("End Sleep")
                    .font(.appBody(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(theme.sleep.main)
                    .clipShape(Capsule())
            }
            .disabled(viewModel.isQuickLogging)

            // Pulsing indicator
            Circle()
                .fill(theme.sleep.main)
                .frame(width: 10, height: 10)
                .modifier(PulseModifier())
        }
        .padding(Spacing.lg)
        .background(theme.sleep.bg.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .stroke(theme.sleep.main.opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Activity Widget Card

    private func activityWidgetCard(for widget: WidgetDefinition) -> some View {
        let colors = widget.colorSet(theme)

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header row
            HStack(spacing: Spacing.sm) {
                ZStack {
                    Circle()
                        .fill(colors.bg)
                        .frame(width: 32, height: 32)
                    Image(systemName: widget.icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(colors.main)
                }

                Text(widget.title)
                    .font(.appBody(size: 13, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)

                Spacer()
            }

            // Last activity content
            activityContent(for: widget.id, colors: colors)

            // Quick-log buttons
            quickLogButtons(for: widget.id, colors: colors)
        }
        .widgetStyle()
    }

    // MARK: - Quick-Log Buttons

    @ViewBuilder
    private func quickLogButtons(for type: String, colors: ActivityColorSet) -> some View {
        let disabled = viewModel.isQuickLogging

        switch type {
        case "feeding":
            HStack(spacing: Spacing.xs) {
                quickPillButton("Breast", color: theme.feedingSub.breast, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogFeeding(babyId: babyId, type: .breast) }
                }
                quickPillButton("Formula", color: theme.feedingSub.formula, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogFeeding(babyId: babyId, type: .formula) }
                }
                quickPillButton("Bottle", color: theme.feedingSub.bottle, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogFeeding(babyId: babyId, type: .bottle) }
                }
            }

        case "diaper":
            HStack(spacing: Spacing.xs) {
                quickPillButton("Pee", color: theme.diaperSub.pee, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogDiaper(babyId: babyId, type: .pee) }
                }
                quickPillButton("Poo", color: theme.diaperSub.poo, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogDiaper(babyId: babyId, type: .poo) }
                }
                quickPillButton("Both", color: colors.main, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogDiaper(babyId: babyId, type: .mixed) }
                }
            }

        case "sleep":
            if viewModel.dashboardData?.currentSleep != nil {
                quickActionButton("End Sleep", icon: "stop.fill", color: colors.main, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogEndSleep(babyId: babyId) }
                }
            } else {
                quickActionButton("Start Sleep", icon: "moon.zzz", color: colors.main, disabled: disabled) {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task { await viewModel.quickLogStartSleep(babyId: babyId) }
                }
            }

        case "pumping":
            quickActionButton("Log Pumping", icon: "drop.fill", color: colors.main, disabled: disabled) {
                guard let babyId = appState.selectedBaby?.id else { return }
                Task { await viewModel.quickLogPumping(babyId: babyId) }
            }

        case "potty":
            quickActionButton("Log Potty", icon: "toilet.fill", color: colors.main, disabled: disabled) {
                guard let babyId = appState.selectedBaby?.id else { return }
                Task { await viewModel.quickLogPotty(babyId: babyId) }
            }

        case "tummy":
            quickActionButton("Log 5 min", icon: "figure.play", color: colors.main, disabled: disabled) {
                guard let babyId = appState.selectedBaby?.id else { return }
                Task { await viewModel.quickLogTummyTime(babyId: babyId) }
            }

        case "bath":
            quickActionButton("Log Bath", icon: "bathtub.fill", color: colors.main, disabled: disabled) {
                guard let babyId = appState.selectedBaby?.id else { return }
                Task { await viewModel.quickLogBath(babyId: babyId) }
            }

        case "supplement":
            // Supplements need a name, so we don't quick-log
            EmptyView()

        default:
            EmptyView()
        }
    }

    // MARK: - Quick-Log Button Styles

    private func quickPillButton(_ label: String, color: Color, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(label)
                .font(.appBody(size: 11, weight: .semibold))
                .foregroundStyle(color)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs + 1)
                .background(color.opacity(0.12))
                .clipShape(Capsule())
        }
        .disabled(disabled)
        .opacity(disabled ? 0.5 : 1.0)
    }

    private func quickActionButton(_ label: String, icon: String, color: Color, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
                Text(label)
                    .font(.appBody(size: 11, weight: .semibold))
            }
            .foregroundStyle(color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.xs + 1)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
        }
        .disabled(disabled)
        .opacity(disabled ? 0.5 : 1.0)
    }

    // MARK: - Activity Content

    @ViewBuilder
    private func activityContent(for type: String, colors: ActivityColorSet) -> some View {
        let data = viewModel.dashboardData

        switch type {
        case "feeding":
            if let feeding = data?.lastFeeding {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: feeding.time))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    HStack(spacing: Spacing.xs) {
                        Text(feeding.type.rawValue.capitalized)
                            .font(.appBody(size: 12, weight: .medium))
                            .foregroundStyle(colors.text)
                        if let ml = feeding.amountMl, ml > 0 {
                            Text("\(Int(ml)) ml")
                                .font(.appBody(size: 12))
                                .foregroundStyle(theme.textMuted)
                        }
                        if let dur = feeding.durationMinutes, dur > 0 {
                            Text("\(Int(dur)) min")
                                .font(.appBody(size: 12))
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                }
            } else {
                emptyActivityLabel
            }

        case "diaper":
            if let diaper = data?.lastDiaper {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: diaper.time))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    Text(diaperTypeLabel(diaper.type))
                        .font(.appBody(size: 12, weight: .medium))
                        .foregroundStyle(colors.text)
                }
            } else {
                emptyActivityLabel
            }

        case "sleep":
            if let sleep = data?.lastSleep {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: sleep.startTime))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    if let dur = sleep.durationMinutes {
                        Text(formatDuration(minutes: dur))
                            .font(.appBody(size: 12, weight: .medium))
                            .foregroundStyle(colors.text)
                    }
                }
            } else {
                emptyActivityLabel
            }

        case "pumping":
            if let pumping = data?.lastPumping {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: pumping.time))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    HStack(spacing: Spacing.xs) {
                        if let ml = pumping.amountMl, ml > 0 {
                            Text("\(Int(ml)) ml")
                                .font(.appBody(size: 12, weight: .medium))
                                .foregroundStyle(colors.text)
                        }
                        if let dur = pumping.durationMinutes, dur > 0 {
                            Text("\(Int(dur)) min")
                                .font(.appBody(size: 12))
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                }
            } else {
                emptyActivityLabel
            }

        case "potty":
            if let potty = data?.lastPotty {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: potty.time))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    Text(potty.result.rawValue.capitalized)
                        .font(.appBody(size: 12, weight: .medium))
                        .foregroundStyle(colors.text)
                }
            } else {
                emptyActivityLabel
            }

        case "tummy":
            if let tummy = data?.lastTummy {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: tummy.startTime))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    Text(formatDuration(minutes: tummy.durationMinutes ?? 0))
                        .font(.appBody(size: 12, weight: .medium))
                        .foregroundStyle(colors.text)
                }
            } else {
                emptyActivityLabel
            }

        case "bath":
            if let bath = data?.lastBath {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: bath.time))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    Text("Last bath")
                        .font(.appBody(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            } else {
                emptyActivityLabel
            }

        case "supplement":
            if let supplement = data?.lastSupplement {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(formatTimeAgo(from: supplement.time))
                        .font(.appBody(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                    HStack(spacing: Spacing.xs) {
                        Text(supplement.name)
                            .font(.appBody(size: 12, weight: .medium))
                            .foregroundStyle(colors.text)
                        if let dosage = supplement.dosage {
                            Text(dosage)
                                .font(.appBody(size: 12))
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                }
            } else {
                emptyActivityLabel
            }

        default:
            emptyActivityLabel
        }
    }

    private var emptyActivityLabel: some View {
        Text("No activity yet")
            .font(.appBody(size: 13))
            .foregroundStyle(theme.textMuted)
            .padding(.top, Spacing.xxs)
    }

    // MARK: - Helpers

    private func diaperTypeLabel(_ type: DiaperType) -> String {
        switch type {
        case .pee: return "Pee"
        case .poo: return "Poo"
        case .mixed: return "Mixed"
        }
    }

    private func refreshData() async {
        guard let baby = appState.selectedBaby else { return }
        async let dashboard: () = viewModel.loadDashboard(babyId: baby.id)
        async let upcoming: () = viewModel.loadUpcoming(babyId: baby.id)
        _ = await (dashboard, upcoming)
    }

    // MARK: - Time Formatting

    private func formatTimeAgo(from isoString: String) -> String {
        guard let date = parseISO8601(isoString) else { return "--" }
        let interval = Date().timeIntervalSince(date)

        if interval < 60 {
            return "Just now"
        } else if interval < 3600 {
            let mins = Int(interval / 60)
            return "\(mins)m ago"
        } else if interval < 86400 {
            let hours = Int(interval / 3600)
            return "\(hours)h ago"
        } else {
            let days = Int(interval / 86400)
            return "\(days)d ago"
        }
    }

    private func formatDuration(minutes: Double) -> String {
        let totalMinutes = Int(minutes)
        if totalMinutes < 60 {
            return "\(totalMinutes) min"
        }
        let hours = totalMinutes / 60
        let mins = totalMinutes % 60
        if mins == 0 {
            return "\(hours)h"
        }
        return "\(hours)h \(mins)m"
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }

        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: string) { return date }

        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.locale = Locale(identifier: "en_US_POSIX")
        df.timeZone = TimeZone(secondsFromGMT: 0)
        return df.date(from: string)
    }
}

// MARK: - Pulse Animation Modifier

private struct PulseModifier: ViewModifier {
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .opacity(isPulsing ? 0.3 : 1.0)
            .animation(
                .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear { isPulsing = true }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        DashboardView()
    }
    .environment(AppState())
}
