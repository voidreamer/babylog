# Xcode Setup — Widgets + Siri Shortcuts

The Swift sources in this directory are staged. They need an Xcode project (which Capacitor generates) and a few GUI-only configurations (capabilities, target membership, entitlements) that can't be expressed as plain text. Run these steps on macOS with Xcode 15+.

## 1. Generate the iOS project

From `frontend/`:

```bash
npm install
npx cap add ios     # creates frontend/ios/
npx cap sync ios
```

This produces `frontend/ios/App/App.xcworkspace`. **Always open `.xcworkspace`, not `.xcodeproj`** — Capacitor uses CocoaPods.

## 2. Add the Capacitor plugin (BabylogBridge)

Move the bridge into the App target:

```bash
mkdir -p ios/App/App/Native
mv ios-native/App/BabylogBridge.swift ios/App/App/Native/
mv ios-native/App/BabylogBridge.m     ios/App/App/Native/
```

In Xcode → `App` project → `App` target → right-click `App` group → **Add Files to "App"…** → select `Native/` → ensure target membership = `App`.

When asked about a bridging header for `BabylogBridge.swift`, accept Xcode's offer to create one. The auto-generated bridging header is fine — Capacitor's headers are reachable through the Pod.

## 3. Add the Widget Extension target

Xcode → File → New → Target → **Widget Extension** → name it `HeyBubWidgets`, bundle id `com.heybub.app.HeyBubWidgets`, language Swift, **uncheck** "Include Live Activity" and "Include Configuration App Intent" (we provide our own intents).

Then replace Xcode's stub with our staged sources:

```bash
rm -rf ios/App/HeyBubWidgets/*.swift   # Xcode-generated stubs only
cp -r ios-native/HeyBubWidgets/* ios/App/HeyBubWidgets/
```

In Xcode, drag the `Shared`, `Widgets`, and `Intents` folders into the `HeyBubWidgets` group → ensure target membership = `HeyBubWidgets` only (not `App`).

**Important — share `Shared/` files with the App target too:** Select each file under `Shared/` (`SharedConfig.swift`, `SharedKeychain.swift`, `PendingQueue.swift`, `BabylogClient.swift`) → File Inspector → Target Membership → check both `App` and `HeyBubWidgets`. The bridge plugin uses `SharedKeychain`, `SharedDefaults`, and `PendingQueue`.

## 4. Capabilities

Repeat for **both** targets (`App` and `HeyBubWidgets`):

1. Select target → **Signing & Capabilities** tab.
2. Click **+ Capability** → add:
   - **App Groups** → `+` → enter `group.com.heybub.app.shared` → enable the checkbox.
   - **Keychain Sharing** → `+` → enter `group.com.heybub.app.shared`.

Then on the **App** target only:

3. **+ Capability** → **Siri**.

If you see "Provisioning profile doesn't include the App Group entitlement," refresh the profile in the Apple Developer portal (App IDs → your bundle ID → enable App Groups + Keychain Sharing + Siri).

## 5. Info.plist additions (App target)

Open `ios/App/App/Info.plist` and add:

```xml
<key>NSSiriUsageDescription</key>
<string>HeyBub uses Siri so you can log feedings, diapers, and sleep hands-free.</string>
```

(That's all — `AppShortcutsProvider` registers shortcuts automatically; you don't need `NSUserActivityTypes` for App Intents.)

## 6. Deployment target

The intents we use require **iOS 17+** (`Button(intent:)` in widgets, `AppShortcutsProvider`). Set both targets' **Minimum Deployments → iOS 17.0** in the Build Settings → Deployment tab.

If you need to support iOS 16, drop the `Button(intent:)` in widget views — Siri/App Intents still work on 16.

## 7. Build and run

Pick the `App` scheme → run on a real device (widget extensions don't add to the home screen on the simulator the same way, and Siri requires hardware mic).

To verify:

1. **Auth handoff**: launch app, sign in. In Xcode → Window → Devices and Simulators → select device → installed apps → HeyBub → Download Container → inspect `AppData/Containers/Shared/AppGroup/<UUID>` for `Library/Preferences/group.com.heybub.app.shared.plist` containing `babylog.selectedBabyId`, etc.
2. **Widget**: long-press home screen → `+` → search "HeyBub" → add Diaper widget. Tap "Wet" — open the app, the diaper appears in the timeline within ~1 s.
3. **Siri**: Settings → Siri & Search → HeyBub → confirm shortcuts. Say "Hey Siri, log baby diaper in HeyBub" — Siri should respond "Logged a mixed diaper."
4. **Offline**: enable airplane mode, fire all four Siri commands and a widget tap. Disable airplane mode, foreground the app — within ~5 s the queue drains and entries appear in Supabase.

## 8. Useful debugging

- **Widget logs**: `Console.app` → filter by `HeyBubWidgets`. Network errors in `BabylogClient` print there.
- **App Group inspection** while running:
  ```swift
  print(SharedDefaults.suite?.dictionaryRepresentation() ?? [:])
  ```
- **Force a widget reload**: from the main app, run `WidgetCenter.shared.reloadAllTimelines()` (already wired into `BabylogBridge.setSession` and `setSelectedBaby`).

## 9. Phrasing constraint (Apple)

iOS App Shortcuts require the app name in the trigger phrase ("…in HeyBub"). The user can rename the auto-suggested shortcut to a bare phrase in the Shortcuts app after first invocation, but the phrases declared in `HeyBubShortcuts` must include `\(.applicationName)`. This is an Apple platform rule, not a design choice.
