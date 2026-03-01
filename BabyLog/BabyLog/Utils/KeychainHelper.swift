import Foundation
import Security

enum KeychainHelper {
    private static let service = "com.heybub.babylog"

    /// The access group is resolved at runtime from the app's entitlements.
    /// Once Keychain Sharing is enabled in Xcode with group "com.heybub.babylog",
    /// iOS automatically includes "$(TeamID).com.heybub.babylog" in the app's
    /// keychain-access-groups entitlement. We read it here so extensions can
    /// share the same keychain items.
    private static let accessGroup: String? = {
        guard let groups = Bundle.main.infoDictionary?["keychain-access-groups"] as? [String],
              let group = groups.first(where: { $0.hasSuffix("com.heybub.babylog") }) else {
            return nil
        }
        return group
    }()

    static func save(_ data: Data, for key: String) -> Bool {
        delete(key)
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    static func save(_ string: String, for key: String) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return save(data, for: key)
    }

    static func load(key: String) -> Data? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        var result: AnyObject?
        SecItemCopyMatching(query as CFDictionary, &result)
        return result as? Data
    }

    static func loadString(key: String) -> String? {
        guard let data = load(key: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    static func delete(_ key: String) -> Bool {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        return SecItemDelete(query as CFDictionary) == errSecSuccess
    }

    static func deleteAll() {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]
        if let accessGroup { query[kSecAttrAccessGroup as String] = accessGroup }
        SecItemDelete(query as CFDictionary)
    }
}
