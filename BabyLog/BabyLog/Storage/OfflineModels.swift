import Foundation
import SwiftData

// MARK: - OfflineBaby

@Model
final class OfflineBaby {
    @Attribute(.unique) var serverId: Int
    var name: String
    var birthDate: String?
    var gender: String?
    var profilePhotoUrl: String?
    var bloodType: String?
    var birthplace: String?
    var birthTime: String?
    var isOwner: Bool
    var createdAt: String?
    var lastUpdated: Date

    init(
        serverId: Int,
        name: String,
        birthDate: String? = nil,
        gender: String? = nil,
        profilePhotoUrl: String? = nil,
        bloodType: String? = nil,
        birthplace: String? = nil,
        birthTime: String? = nil,
        isOwner: Bool = true,
        createdAt: String? = nil
    ) {
        self.serverId = serverId
        self.name = name
        self.birthDate = birthDate
        self.gender = gender
        self.profilePhotoUrl = profilePhotoUrl
        self.bloodType = bloodType
        self.birthplace = birthplace
        self.birthTime = birthTime
        self.isOwner = isOwner
        self.createdAt = createdAt
        self.lastUpdated = Date()
    }

    /// Convert to the API model.
    func toBaby() -> Baby {
        Baby(
            id: serverId,
            name: name,
            birthDate: birthDate,
            gender: gender,
            profilePhotoUrl: profilePhotoUrl,
            bloodType: bloodType,
            birthplace: birthplace,
            birthTime: birthTime,
            isOwner: isOwner,
            sharedWith: nil,
            createdAt: createdAt
        )
    }

    /// Update from an API model.
    func update(from baby: Baby) {
        name = baby.name
        birthDate = baby.birthDate
        gender = baby.gender
        profilePhotoUrl = baby.profilePhotoUrl
        bloodType = baby.bloodType
        birthplace = baby.birthplace
        birthTime = baby.birthTime
        isOwner = baby.isOwner ?? true
        createdAt = baby.createdAt
        lastUpdated = Date()
    }
}

// MARK: - OfflineFeeding

@Model
final class OfflineFeeding {
    @Attribute(.unique) var serverId: String
    var babyId: Int
    var time: String
    var type: String // FeedingType raw value
    var durationMinutes: Double?
    var amountMl: Double?
    var notes: String?
    var createdAt: String?
    var lastUpdated: Date

    init(
        serverId: String,
        babyId: Int,
        time: String,
        type: String,
        durationMinutes: Double? = nil,
        amountMl: Double? = nil,
        notes: String? = nil,
        createdAt: String? = nil
    ) {
        self.serverId = serverId
        self.babyId = babyId
        self.time = time
        self.type = type
        self.durationMinutes = durationMinutes
        self.amountMl = amountMl
        self.notes = notes
        self.createdAt = createdAt
        self.lastUpdated = Date()
    }

    func toFeeding() -> Feeding {
        Feeding(
            id: IntOrString.string(serverId),
            babyId: babyId,
            time: time,
            type: FeedingType(rawValue: type) ?? .bottle,
            durationMinutes: durationMinutes,
            amountMl: amountMl,
            notes: notes,
            createdAt: createdAt
        )
    }

    func update(from feeding: Feeding) {
        babyId = feeding.babyId
        time = feeding.time
        type = feeding.type.rawValue
        durationMinutes = feeding.durationMinutes
        amountMl = feeding.amountMl
        notes = feeding.notes
        createdAt = feeding.createdAt
        lastUpdated = Date()
    }
}

// MARK: - OfflineDiaper

@Model
final class OfflineDiaper {
    @Attribute(.unique) var serverId: String
    var babyId: Int
    var time: String
    var type: String // DiaperType raw value
    var pooColor: String?
    var pooConsistency: String?
    var pooAmount: String?
    var notes: String?
    var createdAt: String?
    var lastUpdated: Date

    init(
        serverId: String,
        babyId: Int,
        time: String,
        type: String,
        pooColor: String? = nil,
        pooConsistency: String? = nil,
        pooAmount: String? = nil,
        notes: String? = nil,
        createdAt: String? = nil
    ) {
        self.serverId = serverId
        self.babyId = babyId
        self.time = time
        self.type = type
        self.pooColor = pooColor
        self.pooConsistency = pooConsistency
        self.pooAmount = pooAmount
        self.notes = notes
        self.createdAt = createdAt
        self.lastUpdated = Date()
    }

    func toDiaper() -> Diaper {
        Diaper(
            id: IntOrString.string(serverId),
            babyId: babyId,
            time: time,
            type: DiaperType(rawValue: type) ?? .pee,
            pooColor: pooColor,
            pooConsistency: pooConsistency,
            pooAmount: pooAmount,
            notes: notes,
            createdAt: createdAt
        )
    }

    func update(from diaper: Diaper) {
        babyId = diaper.babyId
        time = diaper.time
        type = diaper.type.rawValue
        pooColor = diaper.pooColor
        pooConsistency = diaper.pooConsistency
        pooAmount = diaper.pooAmount
        notes = diaper.notes
        createdAt = diaper.createdAt
        lastUpdated = Date()
    }
}

// MARK: - OfflineSleep

@Model
final class OfflineSleep {
    @Attribute(.unique) var serverId: String
    var babyId: Int
    var startTime: String
    var endTime: String?
    var durationMinutes: Double?
    var notes: String?
    var createdAt: String?
    var lastUpdated: Date

    init(
        serverId: String,
        babyId: Int,
        startTime: String,
        endTime: String? = nil,
        durationMinutes: Double? = nil,
        notes: String? = nil,
        createdAt: String? = nil
    ) {
        self.serverId = serverId
        self.babyId = babyId
        self.startTime = startTime
        self.endTime = endTime
        self.durationMinutes = durationMinutes
        self.notes = notes
        self.createdAt = createdAt
        self.lastUpdated = Date()
    }

    func toSleepRecord() -> SleepRecord {
        SleepRecord(
            id: IntOrString.string(serverId),
            babyId: babyId,
            startTime: startTime,
            endTime: endTime,
            durationMinutes: durationMinutes,
            notes: notes,
            createdAt: createdAt
        )
    }

    func update(from sleep: SleepRecord) {
        babyId = sleep.babyId
        startTime = sleep.startTime
        endTime = sleep.endTime
        durationMinutes = sleep.durationMinutes
        notes = sleep.notes
        createdAt = sleep.createdAt
        lastUpdated = Date()
    }
}

// MARK: - OfflinePumping

@Model
final class OfflinePumping {
    @Attribute(.unique) var serverId: String
    var babyId: Int
    var time: String
    var durationMinutes: Double?
    var amountMl: Double?
    var notes: String?
    var createdAt: String?
    var lastUpdated: Date

    init(
        serverId: String,
        babyId: Int,
        time: String,
        durationMinutes: Double? = nil,
        amountMl: Double? = nil,
        notes: String? = nil,
        createdAt: String? = nil
    ) {
        self.serverId = serverId
        self.babyId = babyId
        self.time = time
        self.durationMinutes = durationMinutes
        self.amountMl = amountMl
        self.notes = notes
        self.createdAt = createdAt
        self.lastUpdated = Date()
    }

    func toPumping() -> Pumping {
        Pumping(
            id: IntOrString.string(serverId),
            babyId: babyId,
            time: time,
            durationMinutes: durationMinutes,
            amountMl: amountMl,
            notes: notes,
            createdAt: createdAt
        )
    }

    func update(from pumping: Pumping) {
        babyId = pumping.babyId
        time = pumping.time
        durationMinutes = pumping.durationMinutes
        amountMl = pumping.amountMl
        notes = pumping.notes
        createdAt = pumping.createdAt
        lastUpdated = Date()
    }
}

// MARK: - OfflineActivity
// Generic model for potty, tummy time, bath, and supplement activities.
// The `activityType` discriminator determines which API model to convert to.

@Model
final class OfflineActivity {
    @Attribute(.unique) var compositeKey: String // "\(activityType)_\(serverId)"
    var serverId: String
    var babyId: Int
    var activityType: String // "potty", "tummy", "bath", "supplement"
    var time: String
    var startTime: String? // tummy time uses startTime instead of time
    var durationMinutes: Double?
    var result: String? // potty result
    var pottyType: String?
    var supplementName: String?
    var dosage: String?
    var notes: String?
    var createdAt: String?
    var lastUpdated: Date

    init(
        serverId: String,
        babyId: Int,
        activityType: String,
        time: String,
        startTime: String? = nil,
        durationMinutes: Double? = nil,
        result: String? = nil,
        pottyType: String? = nil,
        supplementName: String? = nil,
        dosage: String? = nil,
        notes: String? = nil,
        createdAt: String? = nil
    ) {
        self.compositeKey = "\(activityType)_\(serverId)"
        self.serverId = serverId
        self.babyId = babyId
        self.activityType = activityType
        self.time = time
        self.startTime = startTime
        self.durationMinutes = durationMinutes
        self.result = result
        self.pottyType = pottyType
        self.supplementName = supplementName
        self.dosage = dosage
        self.notes = notes
        self.createdAt = createdAt
        self.lastUpdated = Date()
    }

    func toPottyLog() -> PottyLog? {
        guard activityType == "potty" else { return nil }
        return PottyLog(
            id: IntOrString.string(serverId),
            babyId: babyId,
            time: time,
            result: PottyResult(rawValue: result ?? "attempt") ?? .attempt,
            pottyType: pottyType,
            notes: notes,
            createdAt: createdAt
        )
    }

    func toTummyTime() -> TummyTime? {
        guard activityType == "tummy" else { return nil }
        return TummyTime(
            id: IntOrString.string(serverId),
            babyId: babyId,
            startTime: startTime ?? time,
            durationMinutes: durationMinutes ?? 0,
            notes: notes,
            createdAt: createdAt
        )
    }

    func toBath() -> Bath? {
        guard activityType == "bath" else { return nil }
        return Bath(
            id: IntOrString.string(serverId),
            babyId: babyId,
            time: time,
            notes: notes,
            createdAt: createdAt
        )
    }

    func toSupplement() -> Supplement? {
        guard activityType == "supplement" else { return nil }
        return Supplement(
            id: IntOrString.string(serverId),
            babyId: babyId,
            time: time,
            name: supplementName ?? "",
            dosage: dosage,
            notes: notes,
            createdAt: createdAt
        )
    }

    // MARK: Update helpers

    func update(from potty: PottyLog) {
        babyId = potty.babyId
        time = potty.time
        result = potty.result.rawValue
        pottyType = potty.pottyType
        notes = potty.notes
        createdAt = potty.createdAt
        lastUpdated = Date()
    }

    func update(from tummy: TummyTime) {
        babyId = tummy.babyId
        startTime = tummy.startTime
        time = tummy.startTime
        durationMinutes = tummy.durationMinutes
        notes = tummy.notes
        createdAt = tummy.createdAt
        lastUpdated = Date()
    }

    func update(from bath: Bath) {
        babyId = bath.babyId
        time = bath.time
        notes = bath.notes
        createdAt = bath.createdAt
        lastUpdated = Date()
    }

    func update(from supplement: Supplement) {
        babyId = supplement.babyId
        time = supplement.time
        supplementName = supplement.name
        dosage = supplement.dosage
        notes = supplement.notes
        createdAt = supplement.createdAt
        lastUpdated = Date()
    }
}

// MARK: - OfflineHealthCache
// Generic JSON blob storage for health data (doctor visits, vaccinations, etc.)
// that does not need individual record sync but benefits from offline read access.

@Model
final class OfflineHealthCache {
    @Attribute(.unique) var cacheKey: String // e.g. "doctor_visits_42", "vaccinations_42"
    var babyId: Int
    var dataType: String // "doctor_visits", "vaccinations", "medications", "growth", "teeth", "sick_days", "allergies"
    var jsonData: String // Serialized JSON array
    var lastUpdated: Date

    init(cacheKey: String, babyId: Int, dataType: String, jsonData: String) {
        self.cacheKey = cacheKey
        self.babyId = babyId
        self.dataType = dataType
        self.jsonData = jsonData
        self.lastUpdated = Date()
    }
}

// MARK: - OfflineSyncAction
// Queue of mutations to replay when connectivity is restored.

@Model
final class OfflineSyncAction {
    var id: UUID
    var actionType: String // "create", "update", "delete"
    var endpoint: String // API endpoint path
    var method: String // "POST", "PUT", "DELETE"
    var payload: String? // JSON-encoded request body
    var retryCount: Int
    var lastRetry: Date?
    var createdAt: Date

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
        self.lastRetry = nil
        self.createdAt = Date()
    }
}
