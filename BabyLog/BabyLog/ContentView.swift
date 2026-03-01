import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @Environment(AuthManager.self) private var authManager
    @Environment(NetworkMonitor.self) private var networkMonitor

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                if appState.isLoading && appState.babies.isEmpty {
                    LoadingView(message: "Loading...")
                } else if appState.babies.isEmpty {
                    OnboardingView()
                } else {
                    MainTabView()
                }
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
    }
}

// MARK: - MainTabView

struct MainTabView: View {
    @Environment(AppState.self) private var appState
    @Environment(NetworkMonitor.self) private var networkMonitor

    var body: some View {
        @Bindable var appState = appState
        ZStack(alignment: .top) {
            TabView(selection: $appState.selectedTab) {
                NavigationStack {
                    DashboardView()
                }
                .tabItem { Label("Dashboard", systemImage: "house.fill") }
                .tag(0)

                NavigationStack {
                    TimelineView()
                }
                .tabItem { Label("Timeline", systemImage: "calendar") }
                .tag(1)

                NavigationStack {
                    HealthView()
                }
                .tabItem { Label("Health", systemImage: "heart.fill") }
                .tag(2)

                NavigationStack {
                    InsightsView()
                }
                .tabItem { Label("Insights", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(3)

                NavigationStack {
                    SettingsView()
                }
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(4)
            }
            .tint(Color.appPrimary)

            OfflineIndicator(isOffline: !networkMonitor.isConnected)
        }
    }
}
