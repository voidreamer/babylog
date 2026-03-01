import Foundation
import SwiftData
import Observation

// MARK: - OfflineSyncEntry
// Lightweight value type used by callers to enqueue offline mutations.

struct OfflineSyncEntry: Sendable {
    let id: UUID
    let actionType: String
    let endpoint: String
    let method: String
    let payload: String?
    let retryCount: Int
    let createdAt: Date

    init(
        actionType: String,
        endpoint: String,
        method: String,
        payload: String? = nil
    ) {
        self.id = UUID()
        self.actionType = actionType
        self.endpoint = endpoint
        self.method = method
        self.payload = payload
        self.retryCount = 0
        self.createdAt = Date()
    }

    init(from model: OfflineSyncAction) {
        self.id = model.id
        self.actionType = model.actionType
        self.endpoint = model.endpoint
        self.method = model.method
        self.payload = model.payload
        self.retryCount = model.retryCount
        self.createdAt = model.createdAt
    }
}

// MARK: - OfflineStore

@Observable
@MainActor
final class OfflineStore {

    private let modelContext: ModelContext

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    // MARK: - Babies

    func cacheBabies(_ babies: [Baby]) {
        for baby in babies {
            let descriptor = FetchDescriptor<OfflineBaby>(
                predicate: #Predicate { $0.serverId == baby.id }
            )
            if let existing = try? modelContext.fetch(descriptor).first {
                existing.update(from: baby)
            } else {
                let offline = OfflineBaby(
                    serverId: baby.id,
                    name: baby.name,
                    birthDate: baby.birthDate,
                    gender: baby.gender,
                    profilePhotoUrl: baby.profilePhotoUrl,
                    bloodType: baby.bloodType,
                    birthplace: baby.birthplace,
                    birthTime: baby.birthTime,
                    isOwner: baby.isOwner ?? true,
                    createdAt: baby.createdAt
                )
                modelContext.insert(offline)
            }
        }
        save()
    }

    func getCachedBabies() -> [Baby] {
        let descriptor = FetchDescriptor<OfflineBaby>(
            sortBy: [SortDescriptor(\.name)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.map { $0.toBaby() }
    }

    // MARK: - Feedings

    func cacheFeedings(_ feedings: [Feeding], babyId: Int) {
        // Remove stale entries for this baby.
        deleteAll(OfflineFeeding.self, matching: #Predicate { $0.babyId == babyId })

        for feeding in feedings {
            let offline = OfflineFeeding(
                serverId: feeding.id.stringValue,
                babyId: feeding.babyId,
                time: feeding.time,
                type: feeding.type.rawValue,
                durationMinutes: feeding.durationMinutes,
                amountMl: feeding.amountMl,
                notes: feeding.notes,
                createdAt: feeding.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedFeedings(babyId: Int) -> [Feeding] {
        let descriptor = FetchDescriptor<OfflineFeeding>(
            predicate: #Predicate { $0.babyId == babyId },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.map { $0.toFeeding() }
    }

    // MARK: - Diapers

    func cacheDiapers(_ diapers: [Diaper], babyId: Int) {
        deleteAll(OfflineDiaper.self, matching: #Predicate { $0.babyId == babyId })

        for diaper in diapers {
            let offline = OfflineDiaper(
                serverId: diaper.id.stringValue,
                babyId: diaper.babyId,
                time: diaper.time,
                type: diaper.type.rawValue,
                pooColor: diaper.pooColor,
                pooConsistency: diaper.pooConsistency,
                pooAmount: diaper.pooAmount,
                notes: diaper.notes,
                createdAt: diaper.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedDiapers(babyId: Int) -> [Diaper] {
        let descriptor = FetchDescriptor<OfflineDiaper>(
            predicate: #Predicate { $0.babyId == babyId },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.map { $0.toDiaper() }
    }

    // MARK: - Sleeps

    func cacheSleeps(_ sleeps: [SleepRecord], babyId: Int) {
        deleteAll(OfflineSleep.self, matching: #Predicate { $0.babyId == babyId })

        for sleep in sleeps {
            let offline = OfflineSleep(
                serverId: sleep.id.stringValue,
                babyId: sleep.babyId,
                startTime: sleep.startTime,
                endTime: sleep.endTime,
                durationMinutes: sleep.durationMinutes,
                notes: sleep.notes,
                createdAt: sleep.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedSleeps(babyId: Int) -> [SleepRecord] {
        let descriptor = FetchDescriptor<OfflineSleep>(
            predicate: #Predicate { $0.babyId == babyId },
            sortBy: [SortDescriptor(\.startTime, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.map { $0.toSleepRecord() }
    }

    // MARK: - Pumpings

    func cachePumpings(_ pumpings: [Pumping], babyId: Int) {
        deleteAll(OfflinePumping.self, matching: #Predicate { $0.babyId == babyId })

        for pumping in pumpings {
            let offline = OfflinePumping(
                serverId: pumping.id.stringValue,
                babyId: pumping.babyId,
                time: pumping.time,
                durationMinutes: pumping.durationMinutes,
                amountMl: pumping.amountMl,
                notes: pumping.notes,
                createdAt: pumping.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedPumpings(babyId: Int) -> [Pumping] {
        let descriptor = FetchDescriptor<OfflinePumping>(
            predicate: #Predicate { $0.babyId == babyId },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.map { $0.toPumping() }
    }

    // MARK: - Activities: Potty

    func cachePottyLogs(_ logs: [PottyLog], babyId: Int) {
        let type = "potty"
        deleteActivities(type: type, babyId: babyId)

        for log in logs {
            let offline = OfflineActivity(
                serverId: log.id.stringValue,
                babyId: log.babyId,
                activityType: type,
                time: log.time,
                result: log.result.rawValue,
                pottyType: log.pottyType,
                notes: log.notes,
                createdAt: log.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedPottyLogs(babyId: Int) -> [PottyLog] {
        let type = "potty"
        let descriptor = FetchDescriptor<OfflineActivity>(
            predicate: #Predicate { $0.babyId == babyId && $0.activityType == type },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.compactMap { $0.toPottyLog() }
    }

    // MARK: - Activities: Tummy Time

    func cacheTummyTimes(_ times: [TummyTime], babyId: Int) {
        let type = "tummy"
        deleteActivities(type: type, babyId: babyId)

        for tummy in times {
            let offline = OfflineActivity(
                serverId: tummy.id.stringValue,
                babyId: tummy.babyId,
                activityType: type,
                time: tummy.startTime,
                startTime: tummy.startTime,
                durationMinutes: tummy.durationMinutes,
                notes: tummy.notes,
                createdAt: tummy.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedTummyTimes(babyId: Int) -> [TummyTime] {
        let type = "tummy"
        let descriptor = FetchDescriptor<OfflineActivity>(
            predicate: #Predicate { $0.babyId == babyId && $0.activityType == type },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.compactMap { $0.toTummyTime() }
    }

    // MARK: - Activities: Baths

    func cacheBaths(_ baths: [Bath], babyId: Int) {
        let type = "bath"
        deleteActivities(type: type, babyId: babyId)

        for bath in baths {
            let offline = OfflineActivity(
                serverId: bath.id.stringValue,
                babyId: bath.babyId,
                activityType: type,
                time: bath.time,
                notes: bath.notes,
                createdAt: bath.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedBaths(babyId: Int) -> [Bath] {
        let type = "bath"
        let descriptor = FetchDescriptor<OfflineActivity>(
            predicate: #Predicate { $0.babyId == babyId && $0.activityType == type },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.compactMap { $0.toBath() }
    }

    // MARK: - Activities: Supplements

    func cacheSupplements(_ supplements: [Supplement], babyId: Int) {
        let type = "supplement"
        deleteActivities(type: type, babyId: babyId)

        for supplement in supplements {
            let offline = OfflineActivity(
                serverId: supplement.id.stringValue,
                babyId: supplement.babyId,
                activityType: type,
                time: supplement.time,
                supplementName: supplement.name,
                dosage: supplement.dosage,
                notes: supplement.notes,
                createdAt: supplement.createdAt
            )
            modelContext.insert(offline)
        }
        save()
    }

    func getCachedSupplements(babyId: Int) -> [Supplement] {
        let type = "supplement"
        let descriptor = FetchDescriptor<OfflineActivity>(
            predicate: #Predicate { $0.babyId == babyId && $0.activityType == type },
            sortBy: [SortDescriptor(\.time, order: .reverse)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.compactMap { $0.toSupplement() }
    }

    // MARK: - Health Data (JSON Blob Cache)

    func cacheHealthData<T: Encodable>(_ data: [T], dataType: String, babyId: Int) {
        let key = "\(dataType)_\(babyId)"

        guard let jsonData = try? encoder.encode(data),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return
        }

        let descriptor = FetchDescriptor<OfflineHealthCache>(
            predicate: #Predicate { $0.cacheKey == key }
        )
        if let existing = try? modelContext.fetch(descriptor).first {
            existing.jsonData = jsonString
            existing.lastUpdated = Date()
        } else {
            let cache = OfflineHealthCache(
                cacheKey: key,
                babyId: babyId,
                dataType: dataType,
                jsonData: jsonString
            )
            modelContext.insert(cache)
        }
        save()
    }

    func getCachedHealthData<T: Decodable>(_ type: T.Type, dataType: String, babyId: Int) -> [T] {
        let key = "\(dataType)_\(babyId)"
        let descriptor = FetchDescriptor<OfflineHealthCache>(
            predicate: #Predicate { $0.cacheKey == key }
        )
        guard let cache = try? modelContext.fetch(descriptor).first,
              let data = cache.jsonData.data(using: .utf8),
              let decoded = try? decoder.decode([T].self, from: data) else {
            return []
        }
        return decoded
    }

    // Convenience health cache methods

    func cacheDoctorVisits(_ visits: [DoctorVisit], babyId: Int) {
        cacheHealthData(visits, dataType: "doctor_visits", babyId: babyId)
    }

    func getCachedDoctorVisits(babyId: Int) -> [DoctorVisit] {
        getCachedHealthData(DoctorVisit.self, dataType: "doctor_visits", babyId: babyId)
    }

    func cacheVaccinations(_ vaccinations: [Vaccination], babyId: Int) {
        cacheHealthData(vaccinations, dataType: "vaccinations", babyId: babyId)
    }

    func getCachedVaccinations(babyId: Int) -> [Vaccination] {
        getCachedHealthData(Vaccination.self, dataType: "vaccinations", babyId: babyId)
    }

    func cacheMedications(_ medications: [Medication], babyId: Int) {
        cacheHealthData(medications, dataType: "medications", babyId: babyId)
    }

    func getCachedMedications(babyId: Int) -> [Medication] {
        getCachedHealthData(Medication.self, dataType: "medications", babyId: babyId)
    }

    func cacheGrowthRecords(_ records: [GrowthRecord], babyId: Int) {
        cacheHealthData(records, dataType: "growth", babyId: babyId)
    }

    func getCachedGrowthRecords(babyId: Int) -> [GrowthRecord] {
        getCachedHealthData(GrowthRecord.self, dataType: "growth", babyId: babyId)
    }

    func cacheTeeth(_ teeth: [Tooth], babyId: Int) {
        cacheHealthData(teeth, dataType: "teeth", babyId: babyId)
    }

    func getCachedTeeth(babyId: Int) -> [Tooth] {
        getCachedHealthData(Tooth.self, dataType: "teeth", babyId: babyId)
    }

    func cacheSickDays(_ sickDays: [SickDay], babyId: Int) {
        cacheHealthData(sickDays, dataType: "sick_days", babyId: babyId)
    }

    func getCachedSickDays(babyId: Int) -> [SickDay] {
        getCachedHealthData(SickDay.self, dataType: "sick_days", babyId: babyId)
    }

    func cacheAllergies(_ allergies: [Allergy], babyId: Int) {
        cacheHealthData(allergies, dataType: "allergies", babyId: babyId)
    }

    func getCachedAllergies(babyId: Int) -> [Allergy] {
        getCachedHealthData(Allergy.self, dataType: "allergies", babyId: babyId)
    }

    // MARK: - Sync Queue

    func queueForSync(_ action: OfflineSyncEntry) {
        let offline = OfflineSyncAction(
            actionType: action.actionType,
            endpoint: action.endpoint,
            method: action.method,
            payload: action.payload
        )
        modelContext.insert(offline)
        save()
    }

    func getPendingOfflineSyncEntrys() -> [OfflineSyncEntry] {
        let descriptor = FetchDescriptor<OfflineSyncAction>(
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let results = try? modelContext.fetch(descriptor) else { return [] }
        return results.map { OfflineSyncEntry(from: $0) }
    }

    var pendingSyncCount: Int {
        let descriptor = FetchDescriptor<OfflineSyncAction>()
        return (try? modelContext.fetchCount(descriptor)) ?? 0
    }

    func removeOfflineSyncEntry(id: UUID) {
        let descriptor = FetchDescriptor<OfflineSyncAction>(
            predicate: #Predicate { $0.id == id }
        )
        if let action = try? modelContext.fetch(descriptor).first {
            modelContext.delete(action)
            save()
        }
    }

    func incrementRetry(id: UUID) {
        let descriptor = FetchDescriptor<OfflineSyncAction>(
            predicate: #Predicate { $0.id == id }
        )
        if let action = try? modelContext.fetch(descriptor).first {
            action.retryCount += 1
            action.lastRetry = Date()
            save()
        }
    }

    func getLastRetry(for id: UUID) -> Date? {
        let descriptor = FetchDescriptor<OfflineSyncAction>(
            predicate: #Predicate { $0.id == id }
        )
        return try? modelContext.fetch(descriptor).first?.lastRetry
    }

    // MARK: - Clear All

    func clearAllCaches() {
        try? modelContext.delete(model: OfflineBaby.self)
        try? modelContext.delete(model: OfflineFeeding.self)
        try? modelContext.delete(model: OfflineDiaper.self)
        try? modelContext.delete(model: OfflineSleep.self)
        try? modelContext.delete(model: OfflinePumping.self)
        try? modelContext.delete(model: OfflineActivity.self)
        try? modelContext.delete(model: OfflineHealthCache.self)
        try? modelContext.delete(model: OfflineSyncAction.self)
        save()
    }

    // MARK: - Private Helpers

    private func save() {
        do {
            try modelContext.save()
        } catch {
            print("[OfflineStore] Save failed: \(error)")
        }
    }

    private func deleteAll<T: PersistentModel>(_ type: T.Type, matching predicate: Predicate<T>) {
        let descriptor = FetchDescriptor<T>(predicate: predicate)
        if let existing = try? modelContext.fetch(descriptor) {
            for item in existing {
                modelContext.delete(item)
            }
        }
    }

    private func deleteActivities(type activityType: String, babyId: Int) {
        let descriptor = FetchDescriptor<OfflineActivity>(
            predicate: #Predicate { $0.babyId == babyId && $0.activityType == activityType }
        )
        if let existing = try? modelContext.fetch(descriptor) {
            for item in existing {
                modelContext.delete(item)
            }
        }
    }
}
