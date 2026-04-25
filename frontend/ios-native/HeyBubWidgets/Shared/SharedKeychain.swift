import Foundation
import Security

enum SharedKeychainError: Error {
    case unhandled(OSStatus)
}

/// Tiny Keychain wrapper that stores items in the shared access group so the
/// main app, widget extension, and App Intents extension can all read tokens.
enum SharedKeychain {

    /// Build the access group string with the team's bundle prefix at runtime.
    /// Apple requires the form `<TeamID>.<group>` for `kSecAttrAccessGroup`.
    private static var accessGroup: String {
        // The bundle prefix is auto-derived; iOS resolves the team prefix from
        // the embedded provisioning profile, so we can pass the bare group.
        // Using the entitlement value directly works on device + simulator.
        SharedConfig.keychainAccessGroup
    }

    static func write(key: String, value: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw SharedKeychainError.unhandled(errSecParam)
        }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        SecItemDelete(query as CFDictionary)

        var addQuery = query
        addQuery[kSecValueData as String] = data
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else { throw SharedKeychainError.unhandled(status) }
    }

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let str = String(data: data, encoding: .utf8) else { return nil }
        return str
    }

    static func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: accessGroup
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw SharedKeychainError.unhandled(status)
        }
    }
}
