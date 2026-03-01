import SwiftUI

struct BabyGreetingView: View {
    let baby: Baby

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Greeting

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:
            return "Good morning"
        case 12..<17:
            return "Good afternoon"
        case 17..<21:
            return "Good evening"
        default:
            return "Good night"
        }
    }

    private var greetingIcon: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:
            return "sun.max.fill"
        case 12..<17:
            return "sun.min.fill"
        case 17..<21:
            return "sunset.fill"
        default:
            return "moon.stars.fill"
        }
    }

    // MARK: - Age Calculation

    private var ageText: String? {
        guard let birthDateString = baby.birthDate,
              let birthDate = parseDateString(birthDateString) else {
            return nil
        }

        let now = Date()
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: birthDate, to: now)

        let years = components.year ?? 0
        let months = components.month ?? 0
        let days = components.day ?? 0

        if years > 0 {
            if months > 0 {
                return "\(years) yr \(months) mo old"
            }
            return "\(years) yr old"
        } else if months > 0 {
            if days > 0 {
                return "\(months) mo \(days) d old"
            }
            return "\(months) mo old"
        } else if days > 0 {
            return "\(days) day\(days == 1 ? "" : "s") old"
        } else {
            return "Born today"
        }
    }

    private func parseDateString(_ string: String) -> Date? {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.locale = Locale(identifier: "en_US_POSIX")
        df.timeZone = TimeZone(secondsFromGMT: 0)
        return df.date(from: string)
    }

    // MARK: - Avatar

    private var avatarInitial: String {
        String(baby.name.prefix(1)).uppercased()
    }

    private var avatarGradient: LinearGradient {
        let gender = baby.gender?.lowercased() ?? ""
        switch gender {
        case "male":
            return LinearGradient(
                colors: [Color(hex: "#88b8d8"), Color(hex: "#6a9cb8")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case "female":
            return LinearGradient(
                colors: [Color(hex: "#f8c8dc"), Color(hex: "#d4849c")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        default:
            return LinearGradient(
                colors: [theme.primaryLight, theme.primary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    // MARK: - Body

    var body: some View {
        HStack(spacing: Spacing.lg) {
            // Avatar
            ZStack {
                Circle()
                    .fill(avatarGradient)
                    .frame(width: 56, height: 56)
                    .shadow(
                        color: theme.primary.opacity(0.2),
                        radius: 8,
                        x: 0,
                        y: 4
                    )

                Text(avatarInitial)
                    .font(.appHeading(size: 22, weight: .bold))
                    .foregroundStyle(.white)
            }

            // Text content
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: greetingIcon)
                        .font(.system(size: 14))
                        .foregroundStyle(theme.primary)
                    Text(greeting)
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                }

                Text(baby.name)
                    .font(.appHeading(size: 24, weight: .bold))
                    .foregroundStyle(theme.text)

                if let age = ageText {
                    Text(age)
                        .font(.appBody(size: 13, weight: .medium))
                        .foregroundStyle(theme.textMuted)
                }
            }

            Spacer()
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
                .fill(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
                        .stroke(theme.borderLight, lineWidth: 0.5)
                )
                .shadow(
                    color: AppShadow.card.color,
                    radius: AppShadow.card.radius,
                    x: AppShadow.card.x,
                    y: AppShadow.card.y
                )
        )
    }
}

// MARK: - Preview

#Preview("Female Baby") {
    BabyGreetingView(baby: Baby(
        id: 1,
        name: "Luna",
        birthDate: "2025-06-15",
        gender: "female",
        profilePhotoUrl: nil,
        bloodType: nil,
        birthplace: nil,
        birthTime: nil,
        isOwner: true,
        sharedWith: nil,
        createdAt: nil
    ))
    .padding()
}

#Preview("Male Baby") {
    BabyGreetingView(baby: Baby(
        id: 2,
        name: "Noah",
        birthDate: "2025-12-01",
        gender: "male",
        profilePhotoUrl: nil,
        bloodType: nil,
        birthplace: nil,
        birthTime: nil,
        isOwner: true,
        sharedWith: nil,
        createdAt: nil
    ))
    .padding()
}
