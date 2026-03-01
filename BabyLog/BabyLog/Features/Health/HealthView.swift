import SwiftUI

// MARK: - HealthView

struct HealthView: View {
    @Environment(AppState.self) private var appState

    @State private var viewModel = HealthViewModel()
    @State private var showAddMenu = false
    @State private var activeSheet: HealthSheet?

    private var baby: Baby? { appState.selectedBaby }

    var body: some View {
        Group {
            if let baby {
                healthContent(baby: baby)
            } else {
                EmptyStateView(
                    icon: "heart",
                    title: "No Baby Selected",
                    subtitle: "Select a baby to view health data."
                )
            }
        }
        .task {
            viewModel.apiClient = appState.apiClient
            guard let baby else { return }
            await viewModel.loadAll(babyId: baby.id)
        }
    }

    private func healthContent(baby: Baby) -> some View {
        NavigationStack {
            content(baby: baby)
                .navigationTitle("Health")
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Menu {
                            Button { activeSheet = .growthRecord } label: {
                                Label("Growth Record", systemImage: "chart.line.uptrend.xyaxis")
                            }
                            Button { activeSheet = .doctorVisit } label: {
                                Label("Doctor Visit", systemImage: "stethoscope")
                            }
                            Button { activeSheet = .vaccination } label: {
                                Label("Vaccination", systemImage: "syringe")
                            }
                            Button { activeSheet = .medication } label: {
                                Label("Medication", systemImage: "pills")
                            }
                            Button { activeSheet = .allergy } label: {
                                Label("Allergy", systemImage: "allergens")
                            }
                            Button { activeSheet = .sickDay } label: {
                                Label("Sick Day", systemImage: "thermometer.medium")
                            }
                        } label: {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 22))
                                .symbolRenderingMode(.hierarchical)
                                .foregroundStyle(AppColors.Light.primary)
                        }
                    }
                }
                .sheet(item: $activeSheet) { sheet in
                    sheetContent(for: sheet, babyId: baby.id)
                }
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func content(baby: Baby) -> some View {
        if viewModel.isLoading && viewModel.growthRecords.isEmpty {
            LoadingView(message: "Loading health data...")
        } else {
            ScrollView {
                VStack(spacing: 16) {
                    NavigationLink {
                        GrowthChartView(
                            growthRecords: viewModel.growthRecords,
                            baby: baby
                        )
                    } label: {
                        GrowthCardView(latestRecord: viewModel.latestGrowth)
                    }
                    .buttonStyle(.plain)

                    NavigationLink {
                        VaccinationScheduleView(
                            vaccinations: viewModel.vaccinations,
                            viewModel: viewModel,
                            babyId: baby.id,
                            onAdd: { activeSheet = .vaccination }
                        )
                    } label: {
                        vaccinationSummaryCard
                    }
                    .buttonStyle(.plain)

                    TeethingCardView(
                        teeth: viewModel.teeth,
                        viewModel: viewModel,
                        babyId: baby.id
                    )

                    AllergiesCardView(
                        allergies: viewModel.allergies,
                        viewModel: viewModel,
                        babyId: baby.id
                    )

                    SickDaysCardView(
                        sickDays: viewModel.sickDays,
                        viewModel: viewModel,
                        babyId: baby.id
                    )

                    RecordsSectionView(
                        doctorVisits: viewModel.doctorVisits,
                        viewModel: viewModel,
                        babyId: baby.id,
                        onAdd: { activeSheet = .doctorVisit }
                    )

                    MedicationQuickLogView(
                        medications: viewModel.medications,
                        viewModel: viewModel,
                        babyId: baby.id,
                        onAdd: { activeSheet = .medication }
                    )
                }
                .padding(16)
            }
            .refreshable {
                await viewModel.loadAll(babyId: baby.id)
            }
        }
    }

    // MARK: - Vaccination Summary Card

    private var vaccinationSummaryCard: some View {
        WidgetCard(title: "Vaccinations", icon: "syringe", accentColor: .purple) {
            if viewModel.vaccinations.isEmpty {
                Text("No vaccinations recorded")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                let uniqueVaccines = Set(viewModel.vaccinations.map(\.vaccineName)).count
                let totalDoses = viewModel.vaccinations.count
                let nextDue = viewModel.vaccinations
                    .compactMap(\.nextDueDate)
                    .sorted()
                    .first

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text("\(uniqueVaccines) vaccines")
                            .font(.headline)
                        Text("(\(totalDoses) doses)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }

                    if let nextDue {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar.badge.clock")
                                .font(.caption)
                                .foregroundStyle(.orange)
                            Text("Next due: \(FormatUtils.formatDisplayDate(nextDue))")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Sheet Content

    @ViewBuilder
    private func sheetContent(for sheet: HealthSheet, babyId: Int) -> some View {
        switch sheet {
        case .growthRecord:
            ModalSheet(title: "Add Growth Record", onDismiss: { activeSheet = nil }) {
                GrowthRecordForm(babyId: babyId) { data in
                    await viewModel.createGrowthRecord(data, babyId: babyId)
                    activeSheet = nil
                }
            }
        case .doctorVisit:
            ModalSheet(title: "Add Doctor Visit", onDismiss: { activeSheet = nil }) {
                DoctorVisitForm(babyId: babyId) { data in
                    await viewModel.createDoctorVisit(data, babyId: babyId)
                    activeSheet = nil
                }
            }
        case .vaccination:
            ModalSheet(title: "Add Vaccination", onDismiss: { activeSheet = nil }) {
                VaccinationForm(babyId: babyId) { data in
                    await viewModel.createVaccination(data, babyId: babyId)
                    activeSheet = nil
                }
            }
        case .medication:
            ModalSheet(title: "Add Medication", onDismiss: { activeSheet = nil }) {
                MedicationForm(babyId: babyId) { data in
                    await viewModel.createMedication(data, babyId: babyId)
                    activeSheet = nil
                }
            }
        case .allergy:
            ModalSheet(title: "Add Allergy", onDismiss: { activeSheet = nil }) {
                AllergyForm(babyId: babyId) { data in
                    await viewModel.createAllergy(data, babyId: babyId)
                    activeSheet = nil
                }
            }
        case .sickDay:
            ModalSheet(title: "Add Sick Day", onDismiss: { activeSheet = nil }) {
                SickDayForm(babyId: babyId) { data in
                    await viewModel.createSickDay(data, babyId: babyId)
                    activeSheet = nil
                }
            }
        }
    }
}

// MARK: - HealthSheet

enum HealthSheet: String, Identifiable {
    case growthRecord
    case doctorVisit
    case vaccination
    case medication
    case allergy
    case sickDay

    var id: String { rawValue }
}

// MARK: - Date Formatting Helper

extension FormatUtils {
    /// Format a date string for display (e.g., "Mar 15, 2025").
    static func formatDisplayDate(_ dateString: String) -> String {
        guard let date = parseDate(dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    /// Format a date string as short display (e.g., "Mar 15").
    static func formatShortDate(_ dateString: String) -> String {
        guard let date = parseDate(dateString) else { return dateString }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    /// Convert a Date to yyyy-MM-dd string.
    static func toDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: date)
    }

    /// Calculate age in months from birth date string to a given date string.
    static func ageInMonths(birthDate: String, atDate: String) -> Double? {
        guard let birth = parseDate(birthDate),
              let target = parseDate(atDate) else { return nil }
        let calendar = Calendar.current
        let components = calendar.dateComponents([.month, .day], from: birth, to: target)
        let months = Double(components.month ?? 0)
        let days = Double(components.day ?? 0)
        return months + (days / 30.0)
    }
}
