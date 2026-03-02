import Foundation
import Observation

@Observable
@MainActor
final class TimelineViewModel {
    var events: [TimelineEvent] = []
    var selectedDate: Date = Date()
    var isLoading = false
    var error: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = APIClient()) {
        self.apiClient = apiClient
    }

    var dateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: selectedDate)
    }

    func loadTimeline(babyId: Int) async {
        isLoading = true
        defer { isLoading = false }
        do {
            // Backend expects JavaScript convention: positive for west of UTC (e.g., 300 for EST)
            // Swift's secondsFromGMT is the opposite sign, so negate it
            let tzOffset = -(TimeZone.current.secondsFromGMT() / 60)
            events = try await apiClient.getTimeline(
                babyId: babyId,
                date: dateString,
                tzOffset: tzOffset
            )
            events.sort { $0.time < $1.time }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func selectDate(_ date: Date, babyId: Int) async {
        selectedDate = date
        await loadTimeline(babyId: babyId)
    }

    func deleteEvent(_ event: TimelineEvent) async {
        do {
            switch event.eventType {
            case "feeding":
                try await apiClient.deleteFeeding(id: event.id)
            case "diaper":
                try await apiClient.deleteDiaper(id: event.id)
            case "sleep":
                try await apiClient.deleteSleep(id: event.id)
            case "pumping":
                try await apiClient.deletePumping(id: event.id)
            case "potty":
                try await apiClient.deletePottyLog(id: event.id)
            case "tummy", "tummy_time":
                try await apiClient.deleteTummyTime(id: event.id)
            case "bath":
                try await apiClient.deleteBath(id: event.id)
            case "supplement":
                try await apiClient.deleteSupplement(id: event.id)
            default:
                break
            }
            // Remove from local state immediately
            events.removeAll { $0.id == event.id }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
