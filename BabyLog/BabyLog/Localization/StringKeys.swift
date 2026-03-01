import Foundation

enum L10n {
    // MARK: - Common
    enum Common {
        static let save = "common.save"
        static let cancel = "common.cancel"
        static let delete = "common.delete"
        static let edit = "common.edit"
        static let add = "common.add"
        static let done = "common.done"
        static let loading = "common.loading"
        static let error = "common.error"
        static let retry = "common.retry"
        static let confirm = "common.confirm"
        static let yes = "common.yes"
        static let no = "common.no"
        static let ok = "common.ok"
        static let close = "common.close"
        static let back = "common.back"
        static let next = "common.next"
        static let notes = "common.notes"
        static let time = "common.time"
        static let date = "common.date"
        static let today = "common.today"
        static let yesterday = "common.yesterday"
        static let noData = "common.noData"
        static let offline = "common.offline"
        static let minutes = "common.minutes"
        static let hours = "common.hours"

        // Activity names
        static let feeding = "common.feeding"
        static let diaper = "common.diaper"
        static let sleep = "common.sleep"
        static let pumping = "common.pumping"
        static let potty = "common.potty"
        static let tummyTime = "common.tummyTime"
        static let bath = "common.bath"
        static let supplement = "common.supplement"

        // Feeding types
        static let breast = "common.breast"
        static let bottle = "common.bottle"
        static let formula = "common.formula"
        static let breastmilkBottle = "common.breastmilkBottle"
        static let solid = "common.solid"

        // Diaper types
        static let pee = "common.pee"
        static let poo = "common.poo"
        static let mixed = "common.mixed"
    }

    // MARK: - Dashboard
    enum Dashboard {
        static let title = "dashboard.title"
        static let goodMorning = "dashboard.goodMorning"
        static let goodAfternoon = "dashboard.goodAfternoon"
        static let goodEvening = "dashboard.goodEvening"
        static let dailySummary = "dashboard.dailySummary"
        static let lastFed = "dashboard.lastFed"
        static let lastDiaper = "dashboard.lastDiaper"
        static let lastSleep = "dashboard.lastSleep"
        static let sleeping = "dashboard.sleeping"
        static let comingUp = "dashboard.comingUp"
        static let widgetSettings = "dashboard.widgetSettings"
        static let noActivities = "dashboard.noActivities"
    }

    // MARK: - Health
    enum Health {
        static let title = "health.title"
        static let growth = "health.growth"
        static let vaccinations = "health.vaccinations"
        static let medications = "health.medications"
        static let teeth = "health.teeth"
        static let allergies = "health.allergies"
        static let sickDays = "health.sickDays"
        static let doctorVisits = "health.doctorVisits"
        static let weight = "health.weight"
        static let height = "health.height"
        static let headCircumference = "health.headCircumference"
        static let addRecord = "health.addRecord"
    }

    // MARK: - Settings
    enum Settings {
        static let title = "settings.title"
        static let babyProfile = "settings.babyProfile"
        static let caregivers = "settings.caregivers"
        static let notifications = "settings.notifications"
        static let appearance = "settings.appearance"
        static let theme = "settings.theme"
        static let language = "settings.language"
        static let units = "settings.units"
        static let metric = "settings.metric"
        static let imperial = "settings.imperial"
        static let account = "settings.account"
        static let signOut = "settings.signOut"
        static let deleteAccount = "settings.deleteAccount"
        static let exportData = "settings.exportData"
        static let premium = "settings.premium"
        static let about = "settings.about"
        static let version = "settings.version"
    }

    // MARK: - Auth
    enum Auth {
        static let signIn = "auth.signIn"
        static let signInWithGoogle = "auth.signInWithGoogle"
        static let signingIn = "auth.signingIn"
        static let welcome = "auth.welcome"
        static let tagline = "auth.tagline"
    }

    // MARK: - Insights
    enum Insights {
        static let title = "insights.title"
        static let predictions = "insights.predictions"
        static let patterns = "insights.patterns"
        static let trends = "insights.trends"
        static let benchmarks = "insights.benchmarks"
        static let todayVsAverage = "insights.todayVsAverage"
        static let restPlanner = "insights.restPlanner"
        static let notEnoughData = "insights.notEnoughData"
    }

    // MARK: - Timeline
    enum Timeline {
        static let title = "timeline.title"
        static let noEvents = "timeline.noEvents"
    }
}
