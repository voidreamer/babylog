import SwiftUI

// MARK: - Period Option

/// Selectable analysis period for the insights tab.
enum InsightsPeriod: Int, CaseIterable, Identifiable {
    case week = 7
    case twoWeeks = 14
    case month = 30

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .week:     return "7 days"
        case .twoWeeks: return "14 days"
        case .month:    return "30 days"
        }
    }
}

// MARK: - InsightsView

struct InsightsView: View {

    @Environment(AppState.self) private var appState

    @State private var viewModel = InsightsViewModel()
    @State private var selectedPeriod: InsightsPeriod = .week
    @Environment(\.colorScheme) private var colorScheme

    private var babyId: Int? { appState.selectedBaby?.id }

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        NavigationStack {
            Group {
                if babyId == nil {
                    EmptyStateView(
                        icon: "chart.line.uptrend.xyaxis",
                        title: "No Baby Selected",
                        subtitle: "Select a baby to view insights."
                    )
                } else if viewModel.isLoading && viewModel.analyticsData == nil {
                    LoadingView(message: "Loading insights...")
                } else if let error = viewModel.error, viewModel.analyticsData == nil {
                    EmptyStateView(
                        icon: "exclamationmark.triangle",
                        title: "Unable to Load",
                        subtitle: error,
                        actionLabel: "Retry"
                    ) {
                        Task {
                            if let babyId { await viewModel.refreshAll(babyId: babyId) }
                        }
                    }
                } else if let data = viewModel.analyticsData, !data.hasEnoughData {
                    notEnoughDataView(theme: theme)
                } else {
                    insightsContent(theme: theme)
                }
            }
            .themedBackground()
            .navigationTitle("Insights")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    periodPicker
                }
            }
        }
        .task {
            viewModel.apiClient = appState.apiClient
            guard let babyId else { return }
            await viewModel.refreshAll(babyId: babyId)
        }
        .onChange(of: selectedPeriod) { _, newPeriod in
            viewModel.selectedDays = newPeriod.rawValue
            Task {
                guard let babyId else { return }
                await viewModel.loadAnalytics(babyId: babyId, days: newPeriod.rawValue)
            }
        }
    }

    // MARK: - Period Picker

    private var periodPicker: some View {
        Menu {
            ForEach(InsightsPeriod.allCases) { period in
                Button {
                    selectedPeriod = period
                } label: {
                    HStack {
                        Text(period.label)
                        if period == selectedPeriod {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Text(selectedPeriod.label)
                    .font(.appBody(size: 14, weight: .medium))
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(.secondarySystemBackground))
            .clipShape(Capsule())
        }
    }

    // MARK: - Not Enough Data

    private func notEnoughDataView(theme: ResolvedTheme) -> some View {
        EmptyStateView(
            icon: "chart.bar.doc.horizontal",
            title: "Not Enough Data",
            subtitle: "Keep logging activities for a few days and insights will appear here automatically."
        )
    }

    // MARK: - Insights Content

    private func insightsContent(theme: ResolvedTheme) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Predictions
                if let predictions = viewModel.analyticsData?.predictions {
                    PredictionsSectionView(predictions: predictions)
                }

                // Patterns
                if let patterns = viewModel.analyticsData?.patterns {
                    PatternsSectionView(patterns: patterns)
                }

                // Today vs Average
                if let todayVsAverage = viewModel.analyticsData?.todayVsAverage {
                    TodayVsAverageView(todayVsAverage: todayVsAverage)
                }

                // Trends
                if let trends = viewModel.analyticsData?.trends {
                    TrendsSectionView(trends: trends)
                }

                // Benchmarks
                if let benchmarks = viewModel.analyticsData?.benchmarks {
                    BenchmarksSectionView(benchmarks: benchmarks)
                }

                // Rest Planner
                RestPlannerView(
                    babyId: babyId ?? 0,
                    isPremium: viewModel.isPremium,
                    restPlanData: viewModel.restPlanData,
                    isLoading: viewModel.isLoadingRestPlan
                )
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
        }
        .refreshable {
            guard let babyId else { return }
            await viewModel.refreshAll(babyId: babyId)
        }
    }
}

// MARK: - Preview

#Preview {
    InsightsView()
        .environment(AppState())
}
