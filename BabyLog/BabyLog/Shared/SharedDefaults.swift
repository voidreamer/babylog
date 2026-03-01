import Foundation

/// Bridge for sharing data between the main app and extensions (widgets, intents)
/// via a shared App Group container.
enum SharedDefaults {
    static let suiteName = "group.com.heybub.babylog"
    static let suite = UserDefaults(suiteName: suiteName)!

    // MARK: - Keys

    private enum Key {
        static let selectedBabyId = "selectedBabyId"
        static let selectedBabyName = "selectedBabyName"
        static let dashboardSnapshot = "dashboardSnapshot"
        static let analyticsSnapshot = "analyticsSnapshot"
        static let lastSyncDate = "lastSyncDate"
    }

    // MARK: - Selected Baby

    static var selectedBabyId: Int? {
        get { suite.object(forKey: Key.selectedBabyId) as? Int }
        set { suite.set(newValue, forKey: Key.selectedBabyId) }
    }

    static var selectedBabyName: String? {
        get { suite.string(forKey: Key.selectedBabyName) }
        set { suite.set(newValue, forKey: Key.selectedBabyName) }
    }

    // MARK: - Dashboard Snapshot

    static var dashboardSnapshot: DashboardData? {
        get {
            guard let data = suite.data(forKey: Key.dashboardSnapshot) else { return nil }
            return try? JSONDecoder().decode(DashboardData.self, from: data)
        }
        set {
            let data = try? JSONEncoder().encode(newValue)
            suite.set(data, forKey: Key.dashboardSnapshot)
        }
    }

    // MARK: - Analytics Snapshot

    static var analyticsSnapshot: AnalyticsPredictions? {
        get {
            guard let data = suite.data(forKey: Key.analyticsSnapshot) else { return nil }
            return try? JSONDecoder().decode(AnalyticsPredictions.self, from: data)
        }
        set {
            let data = try? JSONEncoder().encode(newValue)
            suite.set(data, forKey: Key.analyticsSnapshot)
        }
    }

    // MARK: - Sync Date

    static var lastSyncDate: Date? {
        get { suite.object(forKey: Key.lastSyncDate) as? Date }
        set { suite.set(newValue, forKey: Key.lastSyncDate) }
    }
}
