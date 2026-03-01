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
            let tzOffset = TimeZone.current.secondsFromGMT() / 60
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
}
