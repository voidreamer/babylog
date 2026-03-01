import Foundation
import Observation

// MARK: - SyncEngine
// Processes pending offline sync actions in FIFO order with exponential backoff.

@Observable
@MainActor
final class SyncEngine {

    // MARK: Public State

    var isSyncing: Bool = false
    var pendingCount: Int = 0
    var lastSyncDate: Date?
    var lastError: String?

    // MARK: Configuration

    private let maxRetryCount = 10
    private let baseDelay: TimeInterval = 1.0
    private let maxDelay: TimeInterval = 60.0

    // MARK: Dependencies

    private let offlineStore: OfflineStore
    private let apiClient: APIClient
    private var onUnauthorized: (() -> Void)?

    init(offlineStore: OfflineStore, apiClient: APIClient) {
        self.offlineStore = offlineStore
        self.apiClient = apiClient
    }

    /// Set a handler that fires when the server returns 401 during sync.
    func setOnUnauthorized(_ handler: @escaping () -> Void) {
        self.onUnauthorized = handler
    }

    // MARK: - Sync

    /// Process all pending sync actions in FIFO order.
    /// Returns the number of successfully synced actions.
    @discardableResult
    func sync() async -> Int {
        guard !isSyncing else { return 0 }

        isSyncing = true
        lastError = nil
        defer {
            isSyncing = false
            pendingCount = offlineStore.pendingSyncCount
        }

        let actions = offlineStore.getPendingOfflineSyncEntrys()
        pendingCount = actions.count

        guard !actions.isEmpty else {
            lastSyncDate = Date()
            return 0
        }

        var successCount = 0

        for action in actions {
            // Skip actions that have exceeded the retry limit.
            if action.retryCount >= maxRetryCount {
                offlineStore.removeOfflineSyncEntry(id: action.id)
                pendingCount = offlineStore.pendingSyncCount
                continue
            }

            // Respect backoff: if the action was retried recently, wait.
            if let delay = backoffDelay(for: action) {
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }

            do {
                try await executeSyncAction(action)
                offlineStore.removeOfflineSyncEntry(id: action.id)
                successCount += 1
                pendingCount = offlineStore.pendingSyncCount
            } catch let error as APIError {
                switch error {
                case .unauthorized:
                    // Stop syncing immediately; caller should re-authenticate.
                    lastError = "Authentication expired. Please sign in again."
                    onUnauthorized?()
                    return successCount
                case .notFound:
                    // Resource was deleted server-side; discard the action.
                    offlineStore.removeOfflineSyncEntry(id: action.id)
                    pendingCount = offlineStore.pendingSyncCount
                default:
                    offlineStore.incrementRetry(id: action.id)
                    lastError = error.localizedDescription
                }
            } catch {
                offlineStore.incrementRetry(id: action.id)
                lastError = error.localizedDescription
            }
        }

        lastSyncDate = Date()
        return successCount
    }

    // MARK: - Execute Single Action

    private func executeSyncAction(_ action: OfflineSyncEntry) async throws {
        if let payload = action.payload, !payload.isEmpty {
            let body = RawJSON(jsonString: payload)
            let _: RawJSON = try await apiClient.request(
                action.endpoint,
                method: action.method,
                body: body
            )
        } else {
            try await apiClient.requestVoid(
                action.endpoint,
                method: action.method
            )
        }
    }

    // MARK: - Backoff

    /// Calculate the backoff delay for a given action.
    /// Returns nil if no waiting is needed.
    private func backoffDelay(for action: OfflineSyncEntry) -> TimeInterval? {
        guard action.retryCount > 0,
              let lastRetry = offlineStore.getLastRetry(for: action.id) else {
            return nil
        }

        let delay = min(baseDelay * pow(2.0, Double(action.retryCount - 1)), maxDelay)
        let elapsed = Date().timeIntervalSince(lastRetry)

        if elapsed < delay {
            return delay - elapsed
        }
        return nil
    }
}

// MARK: - RawJSON
// A thin wrapper that re-encodes a pre-serialized JSON string as-is,
// so the APIClient can send it without knowing the concrete type.

struct RawJSON: Codable, Sendable {
    let jsonString: String

    init(jsonString: String) {
        self.jsonString = jsonString
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Accept any JSON value and store it as a string.
        if let dict = try? container.decode([String: AnyCodable].self),
           let encoded = try? JSONEncoder().encode(dict),
           let str = String(data: encoded, encoding: .utf8) {
            jsonString = str
        } else {
            jsonString = "{}"
        }
    }

    func encode(to encoder: Encoder) throws {
        // Write the raw JSON directly. We convert the string back to a JSON
        // object first so it encodes as proper JSON, not a quoted string.
        var container = encoder.singleValueContainer()
        if let data = jsonString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) {
            if let dict = json as? [String: Any] {
                let reEncoded = try JSONSerialization.data(withJSONObject: dict)
                let decoded = try JSONDecoder().decode([String: AnyCodable].self, from: reEncoded)
                try container.encode(decoded)
            } else if let array = json as? [Any] {
                let reEncoded = try JSONSerialization.data(withJSONObject: array)
                let decoded = try JSONDecoder().decode([AnyCodable].self, from: reEncoded)
                try container.encode(decoded)
            } else {
                try container.encodeNil()
            }
        } else {
            try container.encodeNil()
        }
    }
}
