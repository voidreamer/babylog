import Foundation
import Observation

// MARK: - Notification Preferences

struct NotificationPreferences: Codable {
    var enabled: Bool = false
    var feedingReminders: Bool = true
    var diaperReminders: Bool = true
    var sleepReminders: Bool = true
    var medicationReminders: Bool = true
    var reminderIntervalHours: Int = 3

    static let userDefaultsKey = "heybub-notifications"

    static func load() -> NotificationPreferences {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey),
              let prefs = try? JSONDecoder().decode(NotificationPreferences.self, from: data) else {
            return NotificationPreferences()
        }
        return prefs
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: Self.userDefaultsKey)
        }
    }
}

// MARK: - Unit System

enum UnitSystem: String, CaseIterable, Identifiable, Codable {
    case metric
    case imperial

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .metric:   return "Metric (kg, cm)"
        case .imperial: return "Imperial (lb, in)"
        }
    }

    static let userDefaultsKey = "heybub-units"

    static func load() -> UnitSystem {
        guard let raw = UserDefaults.standard.string(forKey: userDefaultsKey),
              let unit = UnitSystem(rawValue: raw) else {
            return .metric
        }
        return unit
    }

    func save() {
        UserDefaults.standard.set(rawValue, forKey: Self.userDefaultsKey)
    }
}

// MARK: - Baby Update Request

struct BabyUpdateRequest: Encodable {
    var name: String?
    var birthDate: String?
    var gender: String?
    var bloodType: String?
    var birthplace: String?
    var birthTime: String?

    enum CodingKeys: String, CodingKey {
        case name
        case birthDate = "birth_date"
        case gender
        case bloodType = "blood_type"
        case birthplace
        case birthTime = "birth_time"
    }
}

// MARK: - Baby Create Request

struct BabyCreateRequest: Encodable {
    let name: String
    var birthDate: String?
    var gender: String?

    enum CodingKeys: String, CodingKey {
        case name
        case birthDate = "birth_date"
        case gender
    }
}

// MARK: - Export Format

enum ExportFormat: String, CaseIterable, Identifiable {
    case csv = "CSV"
    case json = "JSON"

    var id: String { rawValue }
}

// MARK: - SettingsViewModel

@Observable
@MainActor
final class SettingsViewModel {

    // MARK: - State

    var babies: [Baby] = []
    var selectedBaby: Baby?
    var isPremium: Bool = false
    var isLoading: Bool = false
    var error: String?
    var userEmail: String = ""

    var notificationPreferences = NotificationPreferences.load()
    var unitSystem = UnitSystem.load()

    // MARK: - Dependencies

    var apiClient: APIClient

    init(apiClient: APIClient = APIClient()) {
        self.apiClient = apiClient
    }

    // MARK: - Load Settings

    func loadSettings() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let babiesTask = apiClient.getBabies()
            async let subscriptionTask = apiClient.getSubscriptionStatus()
            async let userInfoTask = apiClient.getUserInfo()

            let (loadedBabies, subscription, userInfo) = try await (babiesTask, subscriptionTask, userInfoTask)

            babies = loadedBabies
            isPremium = subscription.premium
            userEmail = userInfo.email ?? ""

            // Restore selected baby
            if let savedId = UserDefaults.standard.object(forKey: "selectedBabyId") as? Int,
               let baby = loadedBabies.first(where: { $0.id == savedId }) {
                selectedBaby = baby
            } else if let first = loadedBabies.first {
                selectedBaby = first
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Baby Profile

    func updateBabyProfile(
        babyId: Int,
        name: String?,
        birthDate: String?,
        gender: String?,
        bloodType: String?,
        birthplace: String?,
        birthTime: String?
    ) async {
        isLoading = true
        defer { isLoading = false }

        let request = BabyUpdateRequest(
            name: name,
            birthDate: birthDate,
            gender: gender,
            bloodType: bloodType,
            birthplace: birthplace,
            birthTime: birthTime
        )

        do {
            let updatedBaby = try await apiClient.updateBaby(id: babyId, request)
            if let index = babies.firstIndex(where: { $0.id == babyId }) {
                babies[index] = updatedBaby
            }
            if selectedBaby?.id == babyId {
                selectedBaby = updatedBaby
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createBaby(name: String, birthDate: String?, gender: String?) async -> Baby? {
        isLoading = true
        defer { isLoading = false }

        let request = BabyCreateRequest(
            name: name,
            birthDate: birthDate,
            gender: gender
        )

        do {
            let newBaby = try await apiClient.createBaby(request)
            babies.append(newBaby)
            if selectedBaby == nil {
                selectedBaby = newBaby
                UserDefaults.standard.set(newBaby.id, forKey: "selectedBabyId")
            }
            return newBaby
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    func deleteBaby(id: Int) async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await apiClient.deleteBaby(id: id)
            babies.removeAll { $0.id == id }
            if selectedBaby?.id == id {
                selectedBaby = babies.first
                if let first = babies.first {
                    UserDefaults.standard.set(first.id, forKey: "selectedBabyId")
                }
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Caregivers

    func shareBaby(babyId: Int, email: String, role: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await apiClient.shareBaby(id: babyId, email: email, role: role)
            await refreshBaby(id: babyId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func unshareBaby(babyId: Int, email: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await apiClient.unshareBaby(id: babyId, email: email)
            await refreshBaby(id: babyId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateCaregiverRole(babyId: Int, email: String, role: String) async {
        do {
            try await apiClient.updateCaregiverRole(babyId: babyId, email: email, role: role)
            await refreshBaby(id: babyId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Account

    func deleteAccount() async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await apiClient.deleteAccount()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func signOut() {
        // Handled by AuthManager at the view level
    }

    // MARK: - Subscription

    func openBillingPortal() async -> URL? {
        do {
            let portal = try await apiClient.createBillingPortal()
            if let urlString = portal.url, let url = URL(string: urlString) {
                return url
            }
        } catch {
            self.error = error.localizedDescription
        }
        return nil
    }

    // MARK: - Export

    func exportData(babyId: Int, format: ExportFormat, startDate: String?, endDate: String?) async -> ExportData? {
        isLoading = true
        defer { isLoading = false }

        do {
            let data = try await apiClient.exportBabyDataJson(
                babyId: babyId,
                startDate: startDate,
                endDate: endDate
            )
            return data
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    // MARK: - Onboarding

    func completeOnboarding() async {
        do {
            try await apiClient.completeOnboarding()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Notification Preferences

    func saveNotificationPreferences() {
        notificationPreferences.save()
    }

    // MARK: - Unit Preferences

    func saveUnitSystem() {
        unitSystem.save()
    }

    // MARK: - Private

    private func refreshBaby(id: Int) async {
        do {
            let baby = try await apiClient.getBaby(id: id)
            if let index = babies.firstIndex(where: { $0.id == id }) {
                babies[index] = baby
            }
            if selectedBaby?.id == id {
                selectedBaby = baby
            }
        } catch {
            // Silent refresh failure
        }
    }
}
