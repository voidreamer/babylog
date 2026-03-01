import Foundation
import Observation
import SwiftUI

@Observable
final class LocalizationManager {
    var currentLanguage: String {
        didSet {
            UserDefaults.standard.set(currentLanguage, forKey: "language")
            UserDefaults.standard.set([currentLanguage], forKey: "AppleLanguages")
            bundle = Self.loadBundle(for: currentLanguage)
        }
    }

    private(set) var bundle: Bundle

    static let supportedLanguages: [(code: String, name: String, nativeName: String)] = [
        ("en", "English", "English"),
        ("es", "Spanish", "Español"),
        ("fr", "French", "Français"),
        ("zh-Hans", "Chinese (Simplified)", "简体中文"),
        ("ja", "Japanese", "日本語"),
        ("hi", "Hindi", "हिन्दी"),
        ("ru", "Russian", "Русский")
    ]

    init() {
        let saved = UserDefaults.standard.string(forKey: "language") ?? "en"
        self.currentLanguage = saved
        self.bundle = Self.loadBundle(for: saved)
    }

    private static func loadBundle(for language: String) -> Bundle {
        guard let path = Bundle.main.path(forResource: language, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            return .main
        }
        return bundle
    }

    func localizedString(_ key: String) -> String {
        bundle.localizedString(forKey: key, value: nil, table: nil)
    }
}
