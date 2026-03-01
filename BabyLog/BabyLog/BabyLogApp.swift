import ActivityKit
import SwiftUI
import SwiftData

@main
struct BabyLogApp: App {
    @State private var appState = AppState()
    @State private var authManager = AuthManager()
    @State private var themeManager = ThemeManager()
    @State private var networkMonitor = NetworkMonitor()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .environment(authManager)
                .environment(themeManager)
                .environment(networkMonitor)
                .preferredColorScheme(themeManager.preferredColorScheme)
                .onOpenURL { url in
                    authManager.handleDeepLink(url)
                }
                .task {
                    networkMonitor.start()
                    await authManager.restoreSession()
                    if authManager.isAuthenticated {
                        wireAPIClient()
                        await appState.loadBabies()
                    }
                }
                .onChange(of: authManager.isAuthenticated) { _, isAuth in
                    if isAuth {
                        wireAPIClient()
                        Task {
                            await appState.loadBabies()
                            restoreLiveActivityIfNeeded()
                        }
                    } else {
                        appState.babies = []
                        appState.selectedBaby = nil
                        SleepActivityManager.endAllActivities()
                    }
                }
        }
        .modelContainer(for: [
            OfflineBaby.self,
            OfflineFeeding.self,
            OfflineDiaper.self,
            OfflineSleep.self,
            OfflinePumping.self,
            OfflineActivity.self,
            OfflineHealthCache.self,
            OfflineSyncAction.self
        ])
    }

    private func wireAPIClient() {
        appState.apiClient.tokenProvider = { [weak authManager] in
            await authManager?.currentAccessToken
        }
        appState.apiClient.onUnauthorized = { [weak authManager] in
            await authManager?.signOut()
        }
    }

    private func restoreLiveActivityIfNeeded() {
        guard !SleepActivityManager.hasRunningActivity,
              let baby = appState.selectedBaby,
              let dashboard = SharedDefaults.dashboardSnapshot,
              let currentSleep = dashboard.currentSleep,
              let sleepId = currentSleep.id.intValue else { return }

        // Parse the start time and restore the Live Activity
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var startDate = formatter.date(from: currentSleep.startTime)
        if startDate == nil {
            formatter.formatOptions = [.withInternetDateTime]
            startDate = formatter.date(from: currentSleep.startTime)
        }
        guard let start = startDate else { return }

        SleepActivityManager.startActivity(babyName: baby.name, startTime: start, sleepId: sleepId)
    }
}

// MARK: - AppState

@Observable
@MainActor
final class AppState {
    var apiClient = APIClient()
    var babies: [Baby] = []
    var selectedBaby: Baby?
    var selectedTab: Int = 0
    var isLoading = false
    var error: String?

    var selectedBabyId: Int? {
        get { UserDefaults.standard.object(forKey: "selectedBabyId") as? Int }
        set { UserDefaults.standard.set(newValue, forKey: "selectedBabyId") }
    }

    func loadBabies() async {
        isLoading = true
        defer { isLoading = false }
        do {
            babies = try await apiClient.getBabies()
            if let savedId = selectedBabyId,
               let baby = babies.first(where: { $0.id == savedId }) {
                selectedBaby = baby
            } else if let first = babies.first {
                selectedBaby = first
                selectedBabyId = first.id
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func selectBaby(_ baby: Baby) {
        selectedBaby = baby
        selectedBabyId = baby.id
        SharedDefaults.selectedBabyId = baby.id
        SharedDefaults.selectedBabyName = baby.name
    }
}
