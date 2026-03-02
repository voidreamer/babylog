import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.scenePhase) private var scenePhase

    @State private var viewModel = DashboardViewModel()

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Greeting

    private static let dayDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f
    }()

    private var timeOfDay: (greeting: String, icon: String) {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:  return ("Good morning", "sun.max.fill")
        case 12..<17: return ("Good afternoon", "sun.min.fill")
        case 17..<21: return ("Good evening", "sunset.fill")
        default:      return ("Good night", "moon.stars.fill")
        }
    }

    private var todayDateString: String {
        Self.dayDateFormatter.string(from: Date())
    }

    // MARK: - Body

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // 1. Greeting Header
                    if let baby = appState.selectedBaby {
                        greetingHeader(baby: baby)
                            .padding(.horizontal, Spacing.lg)
                    }

                    // 2. Status Hero Card
                    if let baby = appState.selectedBaby {
                        StatusHeroCard(
                            baby: baby,
                            predictions: viewModel.analyticsData?.predictions,
                            currentSleep: viewModel.dashboardData?.currentSleep,
                            lastSleep: viewModel.dashboardData?.lastSleep,
                            hasEnoughData: viewModel.analyticsData?.hasEnoughData ?? false,
                            onTapInsights: {
                                appState.selectedTab = 3
                            },
                            onEndSleep: {
                                guard let babyId = appState.selectedBaby?.id else { return }
                                Task { await viewModel.quickLogEndSleep(babyId: babyId) }
                            }
                        )
                        .padding(.horizontal, Spacing.lg)
                    }

                    // 3. Quick Actions Row
                    if let baby = appState.selectedBaby {
                        QuickActionsRow(
                            isSleeping: viewModel.dashboardData?.currentSleep != nil,
                            isQuickLogging: viewModel.isQuickLogging,
                            onFeed: { type in
                                Task { await viewModel.quickLogFeeding(babyId: baby.id, type: type) }
                            },
                            onDiaper: { type in
                                Task { await viewModel.quickLogDiaper(babyId: baby.id, type: type) }
                            },
                            onSleepToggle: {
                                Task {
                                    if viewModel.dashboardData?.currentSleep != nil {
                                        await viewModel.quickLogEndSleep(babyId: baby.id)
                                    } else {
                                        await viewModel.quickLogStartSleep(babyId: baby.id, babyName: baby.name)
                                    }
                                }
                            },
                            onPump: {
                                Task { await viewModel.quickLogPumping(babyId: baby.id) }
                            },
                            onPotty: {
                                Task { await viewModel.quickLogPotty(babyId: baby.id) }
                            },
                            onTummyTime: {
                                Task { await viewModel.quickLogTummyTime(babyId: baby.id) }
                            },
                            onBath: {
                                Task { await viewModel.quickLogBath(babyId: baby.id) }
                            }
                        )
                        .padding(.horizontal, Spacing.lg)
                    }

                    // 4. AI Prediction Cards
                    PredictionCardsRow(
                        predictions: viewModel.analyticsData?.predictions,
                        hasEnoughData: viewModel.analyticsData?.hasEnoughData ?? false,
                        onTapInsights: {
                            appState.selectedTab = 3
                        }
                    )
                    .padding(.horizontal, Spacing.lg)

                    // 5. Today at a Glance
                    TodayAtAGlanceView(
                        summary: viewModel.dashboardData?.dailySummary,
                        benchmarks: viewModel.analyticsData?.benchmarks
                    )
                    .padding(.horizontal, Spacing.lg)

                    // 6. Coming Up
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
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                babySelectorMenu
            }
        }
        .overlay {
            if viewModel.isLoading && viewModel.dashboardData == nil {
                LoadingView(message: "Loading...")
            }
        }
        .task(id: appState.selectedBaby?.id) {
            guard let baby = appState.selectedBaby else { return }
            viewModel = DashboardViewModel(apiClient: appState.apiClient)
            await refreshData()
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await refreshData() }
            }
        }
    }

    // MARK: - Greeting Header

    private func greetingHeader(baby: Baby) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            HStack {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: timeOfDay.icon)
                        .font(.system(size: 14))
                        .foregroundStyle(theme.primary)
                    Text(timeOfDay.greeting)
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                }

                Spacer()

                Text(todayDateString)
                    .font(.appBody(size: 13))
                    .foregroundStyle(theme.textMuted)
            }

            Text(baby.name)
                .font(.appHeading(size: 28, weight: .bold))
                .foregroundStyle(theme.text)

            if let age = ageText(for: baby) {
                Text(age)
                    .font(.appBody(size: 13, weight: .medium))
                    .foregroundStyle(theme.textMuted)
            }
        }
    }

    // MARK: - Age Text

    private func ageText(for baby: Baby) -> String? {
        guard let birthDateString = baby.birthDate,
              let birthDate = FormatUtils.parseDate(birthDateString) else { return nil }

        let components = Calendar.current.dateComponents([.year, .month, .day], from: birthDate, to: Date())
        let years = components.year ?? 0
        let months = components.month ?? 0
        let days = components.day ?? 0

        if years > 0 {
            return months > 0 ? "\(years) yr \(months) mo old" : "\(years) yr old"
        } else if months > 0 {
            return days > 0 ? "\(months) mo \(days) d old" : "\(months) mo old"
        } else if days > 0 {
            return "\(days) day\(days == 1 ? "" : "s") old"
        }
        return "Born today"
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

    // MARK: - Helpers

    private func refreshData() async {
        guard let baby = appState.selectedBaby else { return }
        async let dashboard: () = viewModel.loadDashboard(babyId: baby.id)
        async let upcoming: () = viewModel.loadUpcoming(babyId: baby.id)
        async let analytics: () = viewModel.loadAnalytics(babyId: baby.id)
        _ = await (dashboard, upcoming, analytics)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        DashboardView()
    }
    .environment(AppState())
}
