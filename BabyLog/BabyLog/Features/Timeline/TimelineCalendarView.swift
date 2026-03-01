import SwiftUI

struct TimelineCalendarView: View {
    let selectedDate: Date
    let onDateSelected: (Date) -> Void

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    /// 14 days: 7 past + today + 6 future
    private var dateRange: [Date] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (-7...6).compactMap { offset in
            calendar.date(byAdding: .day, value: offset, to: today)
        }
    }

    private let calendar = Calendar.current

    private var todayStart: Date {
        calendar.startOfDay(for: Date())
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(dateRange, id: \.self) { date in
                        dayButton(for: date)
                            .id(date)
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
            }
            .background(theme.surface)
            .onAppear {
                // Scroll to today on appear
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        proxy.scrollTo(todayStart, anchor: .center)
                    }
                }
            }
        }
    }

    // MARK: - Day Button

    private func dayButton(for date: Date) -> some View {
        let isSelected = calendar.isDate(date, inSameDayAs: selectedDate)
        let isToday = calendar.isDate(date, inSameDayAs: todayStart)

        return Button {
            onDateSelected(date)
        } label: {
            VStack(spacing: Spacing.xs) {
                // Day of week letter
                Text(dayOfWeekLetter(for: date))
                    .font(.appBody(size: 11, weight: .medium))
                    .foregroundStyle(isSelected ? .white : theme.textMuted)

                // Date number
                Text("\(calendar.component(.day, from: date))")
                    .font(.appBody(size: 16, weight: isSelected ? .bold : .semibold))
                    .foregroundStyle(isSelected ? .white : theme.text)

                // Today dot indicator
                Circle()
                    .fill(isSelected ? .white : theme.primary)
                    .frame(width: 4, height: 4)
                    .opacity(isToday ? 1 : 0)
            }
            .frame(width: 44, height: 64)
            .background(
                RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                    .fill(isSelected ? theme.primary : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                    .stroke(
                        isToday && !isSelected ? theme.primary.opacity(0.4) : Color.clear,
                        lineWidth: 1.5
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private func dayOfWeekLetter(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEEE" // Single letter: M, T, W, T, F, S, S
        formatter.locale = Locale.current
        return formatter.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    VStack {
        TimelineCalendarView(
            selectedDate: Date(),
            onDateSelected: { _ in }
        )

        Spacer()
    }
}
