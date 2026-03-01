import SwiftUI

/// A date/time picker that shows time with optional date selection.
///
/// Usage:
/// ```swift
/// TimePicker(selection: $selectedDate, label: "Start Time")
/// TimePicker(selection: $selectedDate, label: "Date & Time", includeDate: true)
/// ```
struct TimePicker: View {
    @Binding var selection: Date
    let label: String
    var includeDate: Bool = false

    var body: some View {
        DatePicker(
            label,
            selection: $selection,
            displayedComponents: includeDate ? [.date, .hourAndMinute] : [.hourAndMinute]
        )
        .datePickerStyle(.compact)
        .labelsHidden()
    }
}

/// A labeled variant that shows a title above the picker.
struct LabeledTimePicker: View {
    @Binding var selection: Date
    let label: String
    var includeDate: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            DatePicker(
                label,
                selection: $selection,
                displayedComponents: includeDate ? [.date, .hourAndMinute] : [.hourAndMinute]
            )
            .datePickerStyle(.compact)
            .labelsHidden()
        }
    }
}
