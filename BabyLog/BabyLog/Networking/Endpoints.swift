import Foundation

// MARK: - Endpoints
// All API endpoint paths grouped by domain.
// Every path is relative to the base URL + "/api" prefix.

enum Endpoints {

    // MARK: Babies

    enum Babies {
        static let list                = "/babies/"
        static func detail(_ id: Int) -> String { "/babies/\(id)" }
        static func share(_ id: Int)  -> String { "/babies/\(id)/share" }
        static func unshare(_ id: Int, email: String) -> String {
            "/babies/\(id)/share/\(email.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? email)"
        }
        static func caregiverRole(_ babyId: Int, email: String) -> String {
            "/babies/\(babyId)/share/\(email.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? email)"
        }
    }

    // MARK: Feedings

    enum Feedings {
        static let base                = "/feedings/"
        static func detail(_ id: Int) -> String { "/feedings/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/feedings/?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Diapers

    enum Diapers {
        static let base                = "/diapers/"
        static func detail(_ id: Int) -> String { "/diapers/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/diapers/?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Sleeps

    enum Sleeps {
        static let base                = "/sleeps/"
        static func detail(_ id: Int) -> String { "/sleeps/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/sleeps/?baby_id=\(babyId)&limit=\(limit)"
        }
        static func current(babyId: Int) -> String { "/sleeps/current?baby_id=\(babyId)" }
        static func end(_ id: Int) -> String { "/sleeps/\(id)/end" }
    }

    // MARK: Pumpings

    enum Pumpings {
        static let base                = "/pumpings/"
        static func detail(_ id: Int) -> String { "/pumpings/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/pumpings/?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Events

    enum Events {
        static func timeline(babyId: Int, date: String? = nil, tzOffset: Int? = nil) -> String {
            var params = "baby_id=\(babyId)"
            if let date { params += "&date=\(date)" }
            if let tzOffset { params += "&tz_offset=\(tzOffset)" }
            return "/events/timeline?\(params)"
        }
        static func dashboard(babyId: Int, localDate: String? = nil, tzOffset: Int? = nil) -> String {
            var params = "baby_id=\(babyId)"
            if let localDate { params += "&local_date=\(localDate)" }
            if let tzOffset { params += "&tz_offset=\(tzOffset)" }
            return "/events/dashboard?\(params)"
        }
    }

    // MARK: Health - Doctor Visits

    enum DoctorVisits {
        static let base                = "/health/doctor-visits/"
        static func detail(_ id: Int) -> String { "/health/doctor-visits/\(id)" }
        static func list(babyId: Int) -> String { "/health/doctor-visits/?baby_id=\(babyId)" }
    }

    // MARK: Health - Vaccinations

    enum Vaccinations {
        static let base                = "/health/vaccinations/"
        static func detail(_ id: Int) -> String { "/health/vaccinations/\(id)" }
        static func list(babyId: Int) -> String { "/health/vaccinations/?baby_id=\(babyId)" }
    }

    // MARK: Health - Medications

    enum Medications {
        static let base                = "/health/medications/"
        static func detail(_ id: Int) -> String { "/health/medications/\(id)" }
        static func list(babyId: Int, activeOnly: Bool = false) -> String {
            "/health/medications/?baby_id=\(babyId)&active_only=\(activeOnly)"
        }
        static func toggle(_ id: Int) -> String { "/health/medications/\(id)/toggle" }
    }

    // MARK: Health - Growth

    enum Growth {
        static let base                = "/health/growth/"
        static func detail(_ id: Int) -> String { "/health/growth/\(id)" }
        static func list(babyId: Int) -> String { "/health/growth/?baby_id=\(babyId)" }
    }

    // MARK: Health - Teeth

    enum Teeth {
        static let base                = "/health/teeth/"
        static func detail(_ id: Int) -> String { "/health/teeth/\(id)" }
        static func list(babyId: Int) -> String { "/health/teeth/?baby_id=\(babyId)" }
    }

    // MARK: Health - Sick Days

    enum SickDays {
        static let base                = "/health/sick-days/"
        static func detail(_ id: Int) -> String { "/health/sick-days/\(id)" }
        static func list(babyId: Int) -> String { "/health/sick-days/?baby_id=\(babyId)" }
    }

    // MARK: Health - Allergies

    enum Allergies {
        static let base                = "/health/allergies/"
        static func detail(_ id: Int) -> String { "/health/allergies/\(id)" }
        static func list(babyId: Int) -> String { "/health/allergies/?baby_id=\(babyId)" }
    }

    // MARK: Health - Upcoming

    enum Upcoming {
        static func list(babyId: Int) -> String { "/health/upcoming/?baby_id=\(babyId)" }
    }

    // MARK: Activities - Potty

    enum Potty {
        static let base                = "/activities/potty"
        static func detail(_ id: Int) -> String { "/activities/potty/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/activities/potty?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Activities - Tummy Time

    enum TummyTimes {
        static let base                = "/activities/tummy-time"
        static func detail(_ id: Int) -> String { "/activities/tummy-time/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/activities/tummy-time?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Activities - Baths

    enum Baths {
        static let base                = "/activities/baths"
        static func detail(_ id: Int) -> String { "/activities/baths/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/activities/baths?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Activities - Supplements

    enum Supplements {
        static let base                = "/activities/supplements"
        static func detail(_ id: Int) -> String { "/activities/supplements/\(id)" }
        static func list(babyId: Int, limit: Int = 50) -> String {
            "/activities/supplements?baby_id=\(babyId)&limit=\(limit)"
        }
    }

    // MARK: Rest Planner

    enum RestPlanner {
        static func plan(babyId: Int, days: Int = 7, tzOffset: Int) -> String {
            "/rest-planner/\(babyId)?days=\(days)&tz_offset=\(tzOffset)"
        }
    }

    // MARK: Analytics

    enum Analytics {
        static func data(babyId: Int, days: Int = 7, tzOffset: Int) -> String {
            "/analytics/\(babyId)?days=\(days)&tz_offset=\(tzOffset)"
        }
    }

    // MARK: Subscription

    enum Subscription {
        static let status              = "/subscription/status"
    }

    // MARK: Users

    enum Users {
        static let me                  = "/users/me"
        static let onboarding          = "/users/me/onboarding"
        static let tour                = "/users/me/tour"
    }

    // MARK: Billing

    enum Billing {
        static let createCheckout      = "/billing/create-checkout-session"
        static let subscription        = "/billing/subscription"
        static let portal              = "/billing/portal"
    }

    // MARK: Export

    enum Export {
        static func json(babyId: Int, startDate: String? = nil, endDate: String? = nil) -> String {
            var params: [String] = []
            if let startDate { params.append("start_date=\(startDate)") }
            if let endDate { params.append("end_date=\(endDate)") }
            let query = params.isEmpty ? "" : "?\(params.joined(separator: "&"))"
            return "/export/json/\(babyId)\(query)"
        }
    }
}
