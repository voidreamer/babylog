import Foundation

// MARK: - IntOrString
// A flexible ID type that can decode either an Int or a String from JSON.
// The backend returns Int IDs for persisted records, but offline-created records
// use temporary string IDs like "temp_xxx" until they are synced.

enum IntOrString: Codable, Hashable, Sendable, CustomStringConvertible {
    case int(Int)
    case string(String)

    var description: String {
        switch self {
        case .int(let value): return "\(value)"
        case .string(let value): return value
        }
    }

    var intValue: Int? {
        switch self {
        case .int(let value): return value
        case .string(let value): return Int(value)
        }
    }

    var stringValue: String {
        switch self {
        case .int(let value): return "\(value)"
        case .string(let value): return value
        }
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else {
            throw DecodingError.typeMismatch(
                IntOrString.self,
                DecodingError.Context(
                    codingPath: decoder.codingPath,
                    debugDescription: "Expected Int or String"
                )
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .int(let value):
            try container.encode(value)
        case .string(let value):
            try container.encode(value)
        }
    }
}
