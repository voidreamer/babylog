import Foundation
import Observation

// MARK: - InsightsViewModel

@Observable
@MainActor
final class InsightsViewModel {

    // MARK: Published State

    var analyticsData: AnalyticsData?
    var restPlanData: RestPlanResponse?
    var isLoading = false
    var isLoadingRestPlan = false
    var error: String?
    var isPremium = false

    /// The currently selected analysis period in days.
    var selectedDays: Int = 7

    // MARK: Dependencies

    var apiClient = APIClient()


    // MARK: - Load Analytics

    func loadAnalytics(babyId: Int, days: Int = 7) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            analyticsData = try await apiClient.getAnalytics(babyId: babyId, days: days)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Load Subscription Status

    func loadSubscriptionStatus() async {
        do {
            let status = try await apiClient.getSubscriptionStatus()
            isPremium = status.premium
        } catch {
            // Non-critical; default to non-premium
            isPremium = false
        }
    }

    // MARK: - Load Rest Plan

    func loadRestPlan(babyId: Int, days: Int = 7) async {
        isLoadingRestPlan = true
        defer { isLoadingRestPlan = false }

        do {
            restPlanData = try await apiClient.getRestPlan(babyId: babyId, days: days)
        } catch {
            restPlanData = nil
        }
    }

    // MARK: - Refresh All

    func refreshAll(babyId: Int) async {
        await loadSubscriptionStatus()
        await loadAnalytics(babyId: babyId, days: selectedDays)
        await loadRestPlan(babyId: babyId, days: selectedDays)
    }
}
