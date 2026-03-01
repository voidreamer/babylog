import SwiftUI

// MARK: - OnboardingView

struct OnboardingView: View {
    @Environment(AppState.self) private var appState
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.colorScheme) private var colorScheme

    @State private var currentPage = 0
    @State private var viewModel = SettingsViewModel()

    // Page 2: Add Baby form state
    @State private var babyName: String = ""
    @State private var babyBirthDate: Date = Date()
    @State private var babyGender: GenderOption = .other

    // Page 3: Preferences state
    @State private var selectedUnits: UnitSystem = UnitSystem.load()
    @State private var selectedTheme: AppColorScheme = .system

    @State private var isCreating = false

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $currentPage) {
                welcomePage
                    .tag(0)

                addBabyPage
                    .tag(1)

                preferencesPage
                    .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))
            .animation(.easeInOut, value: currentPage)

            // Bottom buttons
            bottomButtons
                .padding(.horizontal, Spacing.xl)
                .padding(.bottom, Spacing.xxl)
        }
        .background(theme.background.ignoresSafeArea())
        .task {
            viewModel.apiClient = appState.apiClient
        }
    }

    // MARK: - Page 1: Welcome

    private var welcomePage: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            VStack(spacing: Spacing.lg) {
                Image(systemName: "heart.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(theme.primary)
                    .symbolEffect(.pulse)

                Text("Welcome to HeyBub")
                    .font(.appHeading(size: 28, weight: .bold))
                    .foregroundStyle(theme.text)

                Text("The simple, beautiful way to track your baby's daily activities, health milestones, and growth.")
                    .font(.appBody(size: 16))
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
            }

            VStack(alignment: .leading, spacing: Spacing.lg) {
                featureRow(
                    icon: "cup.and.saucer.fill",
                    color: AppColors.Light.feeding,
                    title: "Track Feedings",
                    description: "Log breast, bottle, and formula feedings"
                )
                featureRow(
                    icon: "moon.fill",
                    color: AppColors.Light.sleep,
                    title: "Monitor Sleep",
                    description: "Track naps and nighttime sleep patterns"
                )
                featureRow(
                    icon: "heart.fill",
                    color: AppColors.Light.diaper,
                    title: "Health Records",
                    description: "Vaccinations, doctor visits, and growth"
                )
                featureRow(
                    icon: "chart.line.uptrend.xyaxis",
                    color: theme.primary,
                    title: "Insights & Analytics",
                    description: "Understand your baby's patterns"
                )
            }
            .padding(.horizontal, Spacing.xxl)

            Spacer()
        }
    }

    private func featureRow(icon: String, color: Color, title: String, description: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(color)
                .frame(width: 36, height: 36)
                .background(color.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.appBody(size: 15, weight: .semibold))
                    .foregroundStyle(theme.text)
                Text(description)
                    .font(.appBody(size: 13))
                    .foregroundStyle(theme.textMuted)
            }
        }
    }

    // MARK: - Page 2: Add Baby

    private var addBabyPage: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            VStack(spacing: Spacing.lg) {
                Image(systemName: "figure.and.child.holdinghands")
                    .font(.system(size: 60))
                    .foregroundStyle(theme.primary)

                Text("Add Your Baby")
                    .font(.appHeading(size: 28, weight: .bold))
                    .foregroundStyle(theme.text)

                Text("Tell us about your little one to get started.")
                    .font(.appBody(size: 16))
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: Spacing.lg) {
                // Name field
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Baby's Name")
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)

                    TextField("Enter name", text: $babyName)
                        .font(.appBody(size: 16))
                        .padding(Spacing.md)
                        .background(theme.surface)
                        .clipShape(RoundedRectangle(cornerRadius: Radii.sm, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                                .stroke(theme.border, lineWidth: 1)
                        )
                }

                // Birth date
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Date of Birth")
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)

                    DatePicker(
                        "",
                        selection: $babyBirthDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                }

                // Gender picker
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Gender")
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)

                    Picker("Gender", selection: $babyGender) {
                        ForEach(GenderOption.allCases) { option in
                            Text(option.displayName).tag(option)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .padding(.horizontal, Spacing.xxl)

            Spacer()
        }
    }

    // MARK: - Page 3: Preferences

    private var preferencesPage: some View {
        VStack(spacing: Spacing.xxl) {
            Spacer()

            VStack(spacing: Spacing.lg) {
                Image(systemName: "slider.horizontal.3")
                    .font(.system(size: 60))
                    .foregroundStyle(theme.primary)

                Text("Your Preferences")
                    .font(.appHeading(size: 28, weight: .bold))
                    .foregroundStyle(theme.text)

                Text("Customize how BabyLog works for you.")
                    .font(.appBody(size: 16))
                    .foregroundStyle(theme.textSecondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: Spacing.xl) {
                // Units
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Measurement Units")
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)

                    Picker("Units", selection: $selectedUnits) {
                        ForEach(UnitSystem.allCases) { unit in
                            Text(unit.displayName).tag(unit)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                // Theme
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text("Appearance")
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)

                    Picker("Theme", selection: $selectedTheme) {
                        ForEach(AppColorScheme.allCases) { scheme in
                            Label(scheme.displayName, systemImage: scheme.iconName)
                                .tag(scheme)
                        }
                    }
                    .pickerStyle(.segmented)
                }
            }
            .padding(.horizontal, Spacing.xxl)

            Spacer()

            // Ready message
            VStack(spacing: Spacing.sm) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(theme.success)
                Text("You're all set!")
                    .font(.appBody(size: 16, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            Spacer()
        }
    }

    // MARK: - Bottom Buttons

    private var bottomButtons: some View {
        HStack {
            if currentPage > 0 {
                Button {
                    withAnimation {
                        currentPage -= 1
                    }
                } label: {
                    Text("Back")
                        .font(.appBody(size: 16, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                }
            }

            Spacer()

            if currentPage < 2 {
                Button {
                    withAnimation {
                        currentPage += 1
                    }
                } label: {
                    Text("Next")
                        .font(.appBody(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, Spacing.md)
                        .background(theme.primary)
                        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
                }
            } else {
                Button {
                    Task { await getStarted() }
                } label: {
                    HStack {
                        if isCreating {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Get Started")
                                .font(.appBody(size: 16, weight: .semibold))
                        }
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(
                        babyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? theme.textMuted
                            : theme.primary
                    )
                    .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
                }
                .disabled(babyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreating)
            }
        }
    }

    // MARK: - Get Started

    private func getStarted() async {
        let trimmedName = babyName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }

        isCreating = true
        defer { isCreating = false }

        // Save preferences
        selectedUnits.save()
        themeManager.colorScheme = selectedTheme

        // Format birth date
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        let birthDateStr = dateFormatter.string(from: babyBirthDate)

        // Create baby
        let baby = await viewModel.createBaby(
            name: trimmedName,
            birthDate: birthDateStr,
            gender: babyGender.rawValue
        )

        if baby != nil {
            // Complete onboarding on the backend
            await viewModel.completeOnboarding()

            // Refresh the app state so ContentView transitions to MainTabView
            await appState.loadBabies()
        }
    }
}

// MARK: - Page Indicator Dot Style

extension OnboardingView {
    func indexViewStyle(_ style: some IndexViewStyle) -> some View {
        self
    }
}

#Preview {
    OnboardingView()
        .environment(AppState())
        .environment(ThemeManager())
}
