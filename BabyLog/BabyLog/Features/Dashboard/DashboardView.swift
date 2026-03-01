import SwiftUI

struct DashboardView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.scenePhase) private var scenePhase

    @State private var viewModel = DashboardViewModel()

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Body

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Status Hero Card
                    if let baby = appState.selectedBaby {
                        StatusHeroCard(
                            baby: baby,
                            predictions: viewModel.analyticsData?.predictions,
                            currentSleep: viewModel.dashboardData?.currentSleep,
                            lastSleep: viewModel.dashboardData?.lastSleep,
                            hasEnoughData: viewModel.analyticsData?.hasEnoughData ?? false,
                            onTapInsights: {
                                appState.selectedTab = 3 // Insights tab
                            },
                            onEndSleep: {
                                guard let babyId = appState.selectedBaby?.id else { return }
                                Task { await viewModel.quickLogEndSleep(babyId: babyId) }
                            }
                        )
                        .padding(.horizontal, Spacing.lg)
                    }

                    // Quick Actions Row
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

                    // Today at a Glance
                    TodayAtAGlanceView(
                        summary: viewModel.dashboardData?.dailySummary,
                        benchmarks: viewModel.analyticsData?.benchmarks
                    )
                    .padding(.horizontal, Spacing.lg)

                    // Recent Activity
                    RecentActivityView(
                        activities: viewModel.recentActivities(theme: theme),
                        onSeeAll: {
                            appState.selectedTab = 1 // Timeline tab
                        }
                    )
                    .padding(.horizontal, Spacing.lg)

                    // Coming Up
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
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task { await refreshData() }
            }
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
