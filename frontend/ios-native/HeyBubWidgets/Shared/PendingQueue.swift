import Foundation

/// Append-only file queue for actions performed by the widget or App Intents
/// while the main app is closed. The shape mirrors `useOfflineSync.queueAction`
/// so the React side can drain and replay through the existing IndexedDB
/// PENDING_SYNC pipeline without translation.
struct PendingAction: Codable {
    let type: String          // e.g. "CREATE_DIAPER", "CREATE_SLEEP", "END_SLEEP"
    let endpoint: String      // e.g. "/diapers/"
    let method: String        // "POST"
    let data: AnyCodable      // typed payload as raw JSON
    let created_at: String    // ISO8601 UTC

    func toDictionary() -> [String: Any] {
        [
            "type": type,
            "endpoint": endpoint,
            "method": method,
            "data": data.value,
            "created_at": created_at
        ]
    }
}

enum PendingQueue {

    private static var fileURL: URL? {
        SharedContainer.url?.appendingPathComponent(SharedKeys.pendingActionsFile)
    }

    private static let lock = NSLock()

    static func enqueue(_ action: PendingAction) {
        lock.lock(); defer { lock.unlock() }
        var current = readAll()
        current.append(action)
        write(current)
    }

    static func drain() -> [PendingAction] {
        lock.lock(); defer { lock.unlock() }
        let actions = readAll()
        if let url = fileURL { try? FileManager.default.removeItem(at: url) }
        return actions
    }

    private static func readAll() -> [PendingAction] {
        guard let url = fileURL,
              let data = try? Data(contentsOf: url) else { return [] }
        return (try? JSONDecoder().decode([PendingAction].self, from: data)) ?? []
    }

    private static func write(_ actions: [PendingAction]) {
        guard let url = fileURL else { return }
        guard let data = try? JSONEncoder().encode(actions) else { return }
        try? data.write(to: url, options: .atomic)
    }
}

/// Tiny type-erased Codable wrapper so we can carry arbitrary JSON payloads
/// without a generic explosion across the queue/intent layers.
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) { self.value = value }

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { value = NSNull() }
        else if let b = try? c.decode(Bool.self) { value = b }
        else if let i = try? c.decode(Int.self) { value = i }
        else if let d = try? c.decode(Double.self) { value = d }
        else if let s = try? c.decode(String.self) { value = s }
        else if let a = try? c.decode([AnyCodable].self) { value = a.map(\.value) }
        else if let o = try? c.decode([String: AnyCodable].self) {
            value = o.mapValues(\.value)
        } else {
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Unsupported type")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch value {
        case is NSNull: try c.encodeNil()
        case let v as Bool: try c.encode(v)
        case let v as Int: try c.encode(v)
        case let v as Double: try c.encode(v)
        case let v as String: try c.encode(v)
        case let v as [Any]: try c.encode(v.map(AnyCodable.init))
        case let v as [String: Any]: try c.encode(v.mapValues(AnyCodable.init))
        default:
            throw EncodingError.invalidValue(value, .init(codingPath: c.codingPath,
                debugDescription: "Unsupported type"))
        }
    }
}
