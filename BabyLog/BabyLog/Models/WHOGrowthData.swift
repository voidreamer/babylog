import Foundation

// MARK: - WHODataPoint

struct WHODataPoint: Codable, Identifiable, Hashable, Sendable {
    var id: Int { months }
    let months: Int
    let p3: Double
    let p15: Double
    let p50: Double
    let p85: Double
    let p97: Double
}

// MARK: - WHOData

struct WHOData: Codable, Hashable, Sendable {
    let whoWeightBoys: [WHODataPoint]
    let whoWeightGirls: [WHODataPoint]
    let whoHeightBoys: [WHODataPoint]
    let whoHeightGirls: [WHODataPoint]

    enum CodingKeys: String, CodingKey {
        case whoWeightBoys = "WHO_WEIGHT_BOYS"
        case whoWeightGirls = "WHO_WEIGHT_GIRLS"
        case whoHeightBoys = "WHO_HEIGHT_BOYS"
        case whoHeightGirls = "WHO_HEIGHT_GIRLS"
    }
}
