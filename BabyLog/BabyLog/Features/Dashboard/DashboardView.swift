import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.scenePhase) private var scenePhase

    @State private var viewModel = DashboardViewModel()
    @State private var contentLoaded = false

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

    // MARK: - Encouragement

    private var encouragementMessage: String? {
        guard let summary = viewModel.dashboardData?.dailySummary else { return nil }
        let total = summary.totalFeedings + summary.totalDiapers + summary.sleepCount
            + summary.pumpingCount + summary.pottyCount + summary.tummyCount + summary.bathCount
        switch total {
        case 0:       return nil
        case 1...3:   return "Great start to the day!"
        case 4...7:   return "You're doing amazing!"
        case 8...12:  return "Super parent mode!"
        default:      return "What a dedicated parent!"
        }
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
                            .staggeredAppear(index: 0)
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
                        .staggeredAppear(index: 1)
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
                        .staggeredAppear(index: 2)
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
                    .staggeredAppear(index: 3)

                    // 5. Rest Planner Widget
                    RestPlannerWidget(
                        restPlanData: viewModel.restPlanData,
                        onTapInsights: {
                            appState.selectedTab = 3
                        }
                    )
                    .padding(.horizontal, Spacing.lg)
                    .staggeredAppear(index: 4)

                    // 6. Today at a Glance
                    TodayAtAGlanceView(
                        summary: viewModel.dashboardData?.dailySummary,
                        benchmarks: viewModel.analyticsData?.benchmarks
                    )
                    .padding(.horizontal, Spacing.lg)
                    .staggeredAppear(index: 5)

                    // 7. Coming Up
                    if !viewModel.upcomingItems.isEmpty {
                        ComingUpView(items: viewModel.upcomingItems)
                            .padding(.horizontal, Spacing.lg)
                            .staggeredAppear(index: 6)
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
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .scale(scale: 0.8)).combined(with: .opacity),
                        removal: .move(edge: .bottom).combined(with: .opacity)
                    ))
                    .animation(.appSnappy, value: viewModel.quickLogSuccess)
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
                DashboardSkeleton()
                    .transition(.opacity)
            }
        }
        .task(id: appState.selectedBaby?.id) {
            guard let baby = appState.selectedBaby else { return }
            viewModel = DashboardViewModel(apiClient: appState.apiClient)
            contentLoaded = false
            await refreshData()
            withAnimation(.appGentle) { contentLoaded = true }
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

            HStack(spacing: Spacing.sm) {
                if let age = ageText(for: baby) {
                    Text(age)
                        .font(.appBody(size: 13, weight: .medium))
                        .foregroundStyle(theme.textMuted)
                }

                if let encouragement = encouragementMessage {
                    Text(encouragement)
                        .font(.appBody(size: 13, weight: .medium))
                        .foregroundStyle(theme.primary)
                        .transition(.opacity)
                }
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
        let isError = message.contains("Failed")

        return HStack(spacing: Spacing.sm) {
            Image(systemName: isError ? "xmark.circle.fill" : "checkmark.circle.fill")
                .font(.system(size: 18))
                .foregroundStyle(isError ? theme.danger : theme.success)

            Text(message)
                .font(.appBody(size: 14, weight: .medium))
                .foregroundStyle(theme.text)
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.vertical, Spacing.md)
        .background(
            Capsule()
                .fill(theme.surface)
                .shadow(color: .black.opacity(0.15), radius: 12, y: 6)
        )
        .overlay(
            Capsule()
                .stroke(isError ? theme.danger.opacity(0.2) : theme.success.opacity(0.2), lineWidth: 1)
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
        async let restPlan: () = viewModel.loadRestPlan(babyId: baby.id)
        _ = await (dashboard, upcoming, analytics, restPlan)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        DashboardView()
    }
    .environment(AppState())
}
