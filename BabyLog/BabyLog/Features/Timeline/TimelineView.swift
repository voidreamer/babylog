import SwiftUI

struct TimelineView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.colorScheme) private var colorScheme

    @State private var viewModel = TimelineViewModel()
    @State private var eventToDelete: TimelineEvent?
    @State private var eventToEdit: TimelineEvent?
    @State private var showDeleteAlert = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        VStack(spacing: 0) {
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

            if viewModel.isLoading && viewModel.events.isEmpty {
                TimelineSkeleton()
                    .transition(.opacity)
            } else if viewModel.events.isEmpty {
                EmptyStateView(
                    icon: "clock",
                    title: "No events yet",
                    subtitle: "No activities recorded for this date.\nStart logging from the Dashboard!",
                    actionLabel: nil
                )
                .transition(.opacity)
            } else {
                TimelineBlockView(
                    events: viewModel.events,
                    selectedDate: viewModel.selectedDate,
                    onEdit: { event in
                        eventToEdit = event
                    },
                    onDelete: { event in
                        eventToDelete = event
                        showDeleteAlert = true
                    }
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
            viewModel = TimelineViewModel(apiClient: appState.apiClient)
            await viewModel.loadTimeline(babyId: babyId)
        }
        .onChange(of: viewModel.selectedDate) {
            guard let babyId = appState.selectedBaby?.id else { return }
            Task {
                await viewModel.loadTimeline(babyId: babyId)
            }
        }
        .sheet(item: $eventToEdit) { event in
            if let babyId = appState.selectedBaby?.id {
                EventEditView(
                    event: event,
                    babyId: babyId,
                    apiClient: appState.apiClient,
                    onSave: {
                        Task {
                            await viewModel.loadTimeline(babyId: babyId)
                        }
                    }
                )
            }
        }
        .alert("Delete Event", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                guard let event = eventToDelete,
                      let babyId = appState.selectedBaby?.id else { return }
                Task {
                    await viewModel.deleteEvent(event)
                    await viewModel.loadTimeline(babyId: babyId)
                }
            }
            Button("Cancel", role: .cancel) {
                eventToDelete = nil
            }
        } message: {
            if let event = eventToDelete {
                Text("Are you sure you want to delete this \(eventDisplayName(event.eventType).lowercased()) entry?")
            }
        }
    }

    private func eventDisplayName(_ type: String) -> String {
        switch type {
        case "feeding":     return "Feeding"
        case "diaper":      return "Diaper"
        case "sleep":       return "Sleep"
        case "pumping":     return "Pumping"
        case "potty":       return "Potty"
        case "tummy", "tummy_time": return "Tummy Time"
        case "bath":        return "Bath"
        case "supplement":  return "Supplement"
        default:            return type.capitalized
        }
    }
}

#Preview {
    NavigationStack {
        TimelineView()
            .environment(AppState())
    }
}
