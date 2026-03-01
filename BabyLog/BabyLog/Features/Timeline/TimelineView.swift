import SwiftUI

struct TimelineView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme

    @State private var viewModel = TimelineViewModel()

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Horizontal date picker
            TimelineCalendarView(
                selectedDate: viewModel.selectedDate,
                onDateSelected: { date in
                    guard let babyId = appState.selectedBaby?.id else { return }
                    Task {
                        await viewModel.selectDate(date, babyId: babyId)
                    }
                }
            )
            .padding(.bottom, Spacing.sm)

            // Content
            if viewModel.isLoading && viewModel.events.isEmpty {
                LoadingView(message: "Loading timeline...")
            } else if viewModel.events.isEmpty {
                EmptyStateView(
                    icon: "clock",
                    title: "No events",
                    subtitle: "No activities recorded for this date. Start logging from the Dashboard."
                )
            } else {
                TimelineBlockView(
                    events: viewModel.events,
                    selectedDate: viewModel.selectedDate
                )
                .refreshable {
                    guard let babyId = appState.selectedBaby?.id else { return }
                    await viewModel.loadTimeline(babyId: babyId)
                }
            }
        }
        .themedBackground()
        .navigationTitle("Timeline")
        .navigationBarTitleDisplayMode(.large)
        .task(id: appState.selectedBaby?.id) {
            guard let babyId = appState.selectedBaby?.id else { return }
            await viewModel.loadTimeline(babyId: babyId)
        }
        .onChange(of: viewModel.selectedDate) {
            guard let babyId = appState.selectedBaby?.id else { return }
            Task {
                await viewModel.loadTimeline(babyId: babyId)
            }
        }
    }
}

#Preview {
    NavigationStack {
        TimelineView()
            .environment(AppState())
    }
}
