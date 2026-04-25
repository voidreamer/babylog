import Foundation
import Capacitor
import WidgetKit

/// Bridges the React/Capacitor app to the App Group container, shared Keychain,
/// and WidgetKit. Lets widgets and App Intents see auth + selected baby state,
/// and lets the main app drain the pending-action queue written by extensions.
@objc(BabylogBridge)
public class BabylogBridge: CAPPlugin {

    @objc func setSession(_ call: CAPPluginCall) {
        guard
            let accessToken = call.getString("accessToken"),
            let refreshToken = call.getString("refreshToken"),
            let apiBaseUrl = call.getString("apiBaseUrl"),
            let supabaseUrl = call.getString("supabaseUrl"),
            let supabaseAnonKey = call.getString("supabaseAnonKey")
        else {
            call.reject("Missing required session fields")
            return
        }
        let expiresAt = call.getDouble("expiresAt") ?? 0

        do {
            try SharedKeychain.write(key: SharedKeys.accessToken, value: accessToken)
            try SharedKeychain.write(key: SharedKeys.refreshToken, value: refreshToken)
        } catch {
            call.reject("Keychain write failed: \(error.localizedDescription)")
            return
        }

        let defaults = SharedDefaults.suite
        defaults?.set(expiresAt, forKey: SharedKeys.expiresAt)
        defaults?.set(apiBaseUrl, forKey: SharedKeys.apiBaseUrl)
        defaults?.set(supabaseUrl, forKey: SharedKeys.supabaseUrl)
        defaults?.set(supabaseAnonKey, forKey: SharedKeys.supabaseAnonKey)

        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearSession(_ call: CAPPluginCall) {
        try? SharedKeychain.delete(key: SharedKeys.accessToken)
        try? SharedKeychain.delete(key: SharedKeys.refreshToken)
        let defaults = SharedDefaults.suite
        defaults?.removeObject(forKey: SharedKeys.expiresAt)
        // Keep apiBaseUrl / supabase config — they're not secrets.
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func setSelectedBaby(_ call: CAPPluginCall) {
        guard let babyId = call.getInt("babyId"),
              let babyName = call.getString("babyName") else {
            call.reject("babyId and babyName required")
            return
        }
        let defaults = SharedDefaults.suite
        defaults?.set(babyId, forKey: SharedKeys.selectedBabyId)
        defaults?.set(babyName, forKey: SharedKeys.selectedBabyName)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func drainPendingActions(_ call: CAPPluginCall) {
        let actions = PendingQueue.drain()
        let payload: [[String: Any]] = actions.map { $0.toDictionary() }
        call.resolve(["actions": payload])
    }
}
