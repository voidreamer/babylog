import Foundation
import Network
import Observation

// MARK: - NetworkMonitor
// Wraps NWPathMonitor to provide observable connectivity state.

@Observable
final class NetworkMonitor: Sendable {
    var isConnected: Bool = true
    var connectionType: ConnectionType = .unknown

    enum ConnectionType: Sendable {
        case wifi, cellular, wired, unknown
    }

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "com.heybub.babylog.NetworkMonitor")

    func start() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isConnected = path.status == .satisfied
                self?.connectionType = self?.getConnectionType(path) ?? .unknown
            }
        }
        monitor.start(queue: queue)
    }

    func stop() {
        monitor.cancel()
    }

    private func getConnectionType(_ path: NWPath) -> ConnectionType {
        if path.usesInterfaceType(.wifi) { return .wifi }
        if path.usesInterfaceType(.cellular) { return .cellular }
        if path.usesInterfaceType(.wiredEthernet) { return .wired }
        return .unknown
    }
}
