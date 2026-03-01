import Foundation
import Observation

// MARK: - HealthViewModel

@Observable
@MainActor
final class HealthViewModel {

    // MARK: - State

    var growthRecords: [GrowthRecord] = []
    var doctorVisits: [DoctorVisit] = []
    var vaccinations: [Vaccination] = []
    var medications: [Medication] = []
    var teeth: [Tooth] = []
    var sickDays: [SickDay] = []
    var allergies: [Allergy] = []

    var isLoading = false
    var error: String?

    // MARK: - Dependencies

    var apiClient = APIClient()


    // MARK: - Load All

    func loadAll(babyId: Int) async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadGrowthRecords(babyId: babyId) }
            group.addTask { await self.loadDoctorVisits(babyId: babyId) }
            group.addTask { await self.loadVaccinations(babyId: babyId) }
            group.addTask { await self.loadMedications(babyId: babyId) }
            group.addTask { await self.loadTeeth(babyId: babyId) }
            group.addTask { await self.loadSickDays(babyId: babyId) }
            group.addTask { await self.loadAllergies(babyId: babyId) }
        }
    }

    // MARK: - Individual Loaders

    func loadGrowthRecords(babyId: Int) async {
        do {
            growthRecords = try await apiClient.getGrowthRecords(babyId: babyId)
                .sorted { $0.recordedDate > $1.recordedDate }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadDoctorVisits(babyId: Int) async {
        do {
            doctorVisits = try await apiClient.getDoctorVisits(babyId: babyId)
                .sorted { $0.visitDate > $1.visitDate }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadVaccinations(babyId: Int) async {
        do {
            vaccinations = try await apiClient.getVaccinations(babyId: babyId)
                .sorted { $0.givenDate > $1.givenDate }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadMedications(babyId: Int) async {
        do {
            medications = try await apiClient.getMedications(babyId: babyId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadTeeth(babyId: Int) async {
        do {
            teeth = try await apiClient.getTeeth(babyId: babyId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadSickDays(babyId: Int) async {
        do {
            sickDays = try await apiClient.getSickDays(babyId: babyId)
                .sorted { $0.date > $1.date }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadAllergies(babyId: Int) async {
        do {
            allergies = try await apiClient.getAllergies(babyId: babyId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Create

    func createGrowthRecord(_ data: some Encodable, babyId: Int) async {
        do {
            let record = try await apiClient.createGrowthRecord(data)
            growthRecords.insert(record, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createDoctorVisit(_ data: some Encodable, babyId: Int) async {
        do {
            let visit = try await apiClient.createDoctorVisit(data)
            doctorVisits.insert(visit, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createVaccination(_ data: some Encodable, babyId: Int) async {
        do {
            let vaccination = try await apiClient.createVaccination(data)
            vaccinations.insert(vaccination, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createMedication(_ data: some Encodable, babyId: Int) async {
        do {
            let medication = try await apiClient.createMedication(data)
            medications.append(medication)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createTooth(_ data: some Encodable, babyId: Int) async {
        do {
            let tooth = try await apiClient.createTooth(data)
            teeth.append(tooth)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createSickDay(_ data: some Encodable, babyId: Int) async {
        do {
            let sickDay = try await apiClient.createSickDay(data)
            sickDays.insert(sickDay, at: 0)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func createAllergy(_ data: some Encodable, babyId: Int) async {
        do {
            let allergy = try await apiClient.createAllergy(data)
            allergies.append(allergy)
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Update

    func updateGrowthRecord(id: Int, _ data: some Encodable, babyId: Int) async {
        do {
            let updated = try await apiClient.updateGrowthRecord(id: id, data)
            if let index = growthRecords.firstIndex(where: { $0.id == id }) {
                growthRecords[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateDoctorVisit(id: Int, _ data: some Encodable, babyId: Int) async {
        do {
            let updated = try await apiClient.updateDoctorVisit(id: id, data)
            if let index = doctorVisits.firstIndex(where: { $0.id == id }) {
                doctorVisits[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateVaccination(id: Int, _ data: some Encodable, babyId: Int) async {
        do {
            let updated = try await apiClient.updateVaccination(id: id, data)
            if let index = vaccinations.firstIndex(where: { $0.id == id }) {
                vaccinations[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateMedication(id: Int, _ data: some Encodable, babyId: Int) async {
        do {
            let updated = try await apiClient.updateMedication(id: id, data)
            if let index = medications.firstIndex(where: { $0.id == id }) {
                medications[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateAllergy(id: Int, _ data: some Encodable, babyId: Int) async {
        do {
            let updated = try await apiClient.updateAllergy(id: id, data)
            if let index = allergies.firstIndex(where: { $0.id == id }) {
                allergies[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateSickDay(id: Int, _ data: some Encodable, babyId: Int) async {
        do {
            let updated = try await apiClient.updateSickDay(id: id, data)
            if let index = sickDays.firstIndex(where: { $0.id == id }) {
                sickDays[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Delete

    func deleteGrowthRecord(id: Int) async {
        do {
            try await apiClient.deleteGrowthRecord(id: id)
            growthRecords.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteDoctorVisit(id: Int) async {
        do {
            try await apiClient.deleteDoctorVisit(id: id)
            doctorVisits.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteVaccination(id: Int) async {
        do {
            try await apiClient.deleteVaccination(id: id)
            vaccinations.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteMedication(id: Int) async {
        do {
            try await apiClient.deleteMedication(id: id)
            medications.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteTooth(id: Int) async {
        do {
            try await apiClient.deleteTooth(id: id)
            teeth.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteSickDay(id: Int) async {
        do {
            try await apiClient.deleteSickDay(id: id)
            sickDays.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteAllergy(id: Int) async {
        do {
            try await apiClient.deleteAllergy(id: id)
            allergies.removeAll { $0.id == id }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Toggle Medication

    func toggleMedicationActive(id: Int) async {
        do {
            let updated = try await apiClient.toggleMedicationActive(id: id)
            if let index = medications.firstIndex(where: { $0.id == id }) {
                medications[index] = updated
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Computed Helpers

    var latestGrowth: GrowthRecord? {
        growthRecords.first
    }

    var activeMedications: [Medication] {
        medications.filter { $0.isActive }
    }

    var teethCount: Int {
        teeth.count
    }
}
