import Foundation

enum UnitConversion {
    // Weight
    static func kgToLbs(_ kg: Double) -> Double { kg * 2.20462 }
    static func lbsToKg(_ lbs: Double) -> Double { lbs / 2.20462 }

    // Height
    static func cmToIn(_ cm: Double) -> Double { cm / 2.54 }
    static func inToCm(_ inches: Double) -> Double { inches * 2.54 }

    // Volume
    static func mlToOz(_ ml: Double) -> Double { ml / 29.5735 }
    static func ozToMl(_ oz: Double) -> Double { oz * 29.5735 }

    // Temperature
    static func celsiusToFahrenheit(_ c: Double) -> Double { c * 9.0 / 5.0 + 32.0 }
    static func fahrenheitToCelsius(_ f: Double) -> Double { (f - 32.0) * 5.0 / 9.0 }

    // Preference
    static var useImperial: Bool {
        UserDefaults.standard.string(forKey: "heybub-units") == "imperial"
    }

    static func formatWeight(_ kg: Double) -> String {
        if useImperial {
            return String(format: "%.1f lbs", kgToLbs(kg))
        }
        return String(format: "%.1f kg", kg)
    }

    static func formatHeight(_ cm: Double) -> String {
        if useImperial {
            return String(format: "%.1f in", cmToIn(cm))
        }
        return String(format: "%.1f cm", cm)
    }

    static func formatVolume(_ ml: Double) -> String {
        if useImperial {
            return String(format: "%.1f oz", mlToOz(ml))
        }
        return String(format: "%.0f ml", ml)
    }

    static func formatTemperature(_ celsius: Double) -> String {
        if useImperial {
            return String(format: "%.1f\u{00B0}F", celsiusToFahrenheit(celsius))
        }
        return String(format: "%.1f\u{00B0}C", celsius)
    }
}
