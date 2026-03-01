import SwiftUI

// MARK: - Supported Language

enum SupportedLanguage: String, CaseIterable, Identifiable {
    case en = "en"
    case esCO = "es-CO"
    case frCA = "fr-CA"
    case zhCN = "zh-CN"
    case ja = "ja"
    case hi = "hi"
    case ru = "ru"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .en:   return "English"
        case .esCO: return "Espanol (Colombia)"
        case .frCA: return "Francais (Canada)"
        case .zhCN: return "Chinese (Simplified)"
        case .ja:   return "Japanese"
        case .hi:   return "Hindi"
        case .ru:   return "Russian"
        }
    }

    var nativeName: String {
        switch self {
        case .en:   return "English"
        case .esCO: return "Espanol"
        case .frCA: return "Francais"
        case .zhCN: return "中文 (简体)"
        case .ja:   return "日本語"
        case .hi:   return "हिन्दी"
        case .ru:   return "Русский"
        }
    }

    var flag: String {
        switch self {
        case .en:   return "🇺🇸"
        case .esCO: return "🇨🇴"
        case .frCA: return "🇨🇦"
        case .zhCN: return "🇨🇳"
        case .ja:   return "🇯🇵"
        case .hi:   return "🇮🇳"
        case .ru:   return "🇷🇺"
        }
    }

    static let userDefaultsKey = "language"

    static func load() -> SupportedLanguage {
        guard let raw = UserDefaults.standard.string(forKey: userDefaultsKey),
              let lang = SupportedLanguage(rawValue: raw) else {
            return .en
        }
        return lang
    }

    func save() {
        UserDefaults.standard.set(rawValue, forKey: Self.userDefaultsKey)
    }
}

// MARK: - AppearanceSettingsView

struct AppearanceSettingsView: View {
    @Bindable var viewModel: SettingsViewModel
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    @State private var selectedLanguage = SupportedLanguage.load()

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        Form {
            // MARK: Theme
            Section {
                Picker("Theme", selection: Binding(
                    get: { themeManager.colorScheme },
                    set: { themeManager.colorScheme = $0 }
                )) {
                    ForEach(AppColorScheme.allCases) { scheme in
                        Label(scheme.displayName, systemImage: scheme.iconName)
                            .tag(scheme)
                    }
                }
                .font(.appBody(size: 15))
            } header: {
                Text("Theme")
            } footer: {
                Text("Choose how BabyLog appears. System follows your device settings.")
                    .font(.appBody(size: 12))
            }

            // MARK: Theme Preview
            Section {
                HStack(spacing: Spacing.lg) {
                    themePreviewCard(
                        label: "Light",
                        background: AppColors.Light.surface,
                        text: AppColors.Light.text,
                        accent: AppColors.Light.primary,
                        isSelected: themeManager.colorScheme == .light
                    )
                    themePreviewCard(
                        label: "Dark",
                        background: AppColors.Dark.surface,
                        text: AppColors.Dark.text,
                        accent: AppColors.Dark.primary,
                        isSelected: themeManager.colorScheme == .dark
                    )
                    themePreviewCard(
                        label: "System",
                        background: colorScheme == .dark ? AppColors.Dark.surface : AppColors.Light.surface,
                        text: colorScheme == .dark ? AppColors.Dark.text : AppColors.Light.text,
                        accent: colorScheme == .dark ? AppColors.Dark.primary : AppColors.Light.primary,
                        isSelected: themeManager.colorScheme == .system
                    )
                }
                .padding(.vertical, Spacing.sm)
                .listRowBackground(Color.clear)
            }

            // MARK: Language
            Section {
                Picker("Language", selection: $selectedLanguage) {
                    ForEach(SupportedLanguage.allCases) { lang in
                        HStack {
                            Text(lang.flag)
                            Text(lang.nativeName)
                        }
                        .tag(lang)
                    }
                }
                .font(.appBody(size: 15))
                .onChange(of: selectedLanguage) { _, newValue in
                    newValue.save()
                }
            } header: {
                Text("Language")
            } footer: {
                Text("App language. You may need to restart the app for all changes to take effect.")
                    .font(.appBody(size: 12))
            }

            // MARK: Units
            Section {
                Picker("Unit System", selection: Binding(
                    get: { viewModel.unitSystem },
                    set: { newValue in
                        viewModel.unitSystem = newValue
                        viewModel.saveUnitSystem()
                    }
                )) {
                    ForEach(UnitSystem.allCases) { unit in
                        Text(unit.displayName).tag(unit)
                    }
                }
                .font(.appBody(size: 15))
            } header: {
                Text("Units")
            } footer: {
                Text("Used for weight, height, and temperature measurements.")
                    .font(.appBody(size: 12))
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Theme Preview Card

    private func themePreviewCard(
        label: String,
        background: Color,
        text: Color,
        accent: Color,
        isSelected: Bool
    ) -> some View {
        VStack(spacing: Spacing.sm) {
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(background)
                .frame(height: 60)
                .overlay {
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .fill(accent)
                            .frame(width: 30, height: 6)
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(text.opacity(0.3))
                            .frame(width: 40, height: 4)
                        RoundedRectangle(cornerRadius: 3, style: .continuous)
                            .fill(text.opacity(0.2))
                            .frame(width: 36, height: 4)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                        .stroke(
                            isSelected ? theme.primary : theme.border,
                            lineWidth: isSelected ? 2 : 1
                        )
                )

            Text(label)
                .font(.appBody(size: 12, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? theme.primary : theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .onTapGesture {
            switch label {
            case "Light":  themeManager.colorScheme = .light
            case "Dark":   themeManager.colorScheme = .dark
            default:       themeManager.colorScheme = .system
            }
        }
    }
}

#Preview {
    NavigationStack {
        AppearanceSettingsView(viewModel: SettingsViewModel())
            .environment(ThemeManager())
    }
}
