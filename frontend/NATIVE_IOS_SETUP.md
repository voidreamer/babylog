# Native iOS App Setup Guide

This document outlines the steps to complete the native iOS app setup for Simple Baby.

## Current Status

Your Capacitor setup is **95% complete**. Almost everything is configured and ready to go!

### ✅ Already Completed

- [x] Capacitor core installed (`@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` v8)
- [x] iOS project generated (`ios/App/App.xcodeproj`)
- [x] `capacitor.config.json` configured
  - App ID: `com.simplebaby.app`
  - App Name: `Simple Baby`
  - URL Scheme: `simplebaby://` (for OAuth callback)
  - Background color: `#18181b`
- [x] URL scheme configured in `Info.plist` for OAuth deep linking
- [x] Custom app icon added (`AppIcon-512@2x.png`)
- [x] Splash screen configured
- [x] Browser plugin installed (for OAuth)
- [x] App plugin installed (for deep linking)
- [x] Auth code handles native platform detection
- [x] Recent auth improvements:
  - IndexedDB backup storage (iOS Safari ITP resistant)
  - Visibility change listener for proactive token refresh
  - Periodic token refresh (every minute, refreshes 5min before expiry)

### 🔧 What You Need to Do

Only **2 things** are needed to run on your iPhone:

1. Apple Developer Account
2. Configure code signing in Xcode

---

## Step-by-Step Instructions

### 1. Apple Developer Account

**You need an Apple Developer account to install apps on your iPhone.**

1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign up for Apple Developer Program
   - Cost: $99/year USD
   - Required for: Code signing, TestFlight, App Store
3. Complete enrollment (may take 24-48 hours for approval)

---

### 2. Build & Sync the iOS App

Once your developer account is ready:

```bash
# Navigate to frontend directory
cd /Users/tv01d/Documents/projects/vibe/huckle/frontend

# Build the web assets
npm run build

# Sync web assets to iOS native project
npx cap sync ios
```

The `sync` command:
- Copies your web build to the iOS project
- Installs any new Capacitor plugins
- Updates native configuration

---

### 3. Configure Code Signing in Xcode

Open the project in Xcode:

```bash
npx cap open ios
```

In Xcode:

1. **Select the project** in the left sidebar (blue icon "App")
2. **Select the "App" target** in the main area
3. Go to **"Signing & Capabilities"** tab
4. Under "Signing", check **"Automatically manage signing"**
5. Select your **Team** from the dropdown (your Apple Developer account)
6. Xcode will automatically:
   - Create a signing certificate
   - Create a provisioning profile
   - Configure your bundle ID

> If you see any errors about bundle ID conflicts, you may need to change `com.simplebaby.app` to something unique like `com.yourname.simplebaby`

---

### 4. Run on Your iPhone

**Connect your iPhone via USB:**

1. Unlock your iPhone
2. Trust your computer if prompted

**In Xcode:**

1. Select your iPhone from the device dropdown (top toolbar, next to the Run button)
2. Click the **Run button** (▶️) or press `Cmd + R`
3. Wait for the build to complete

**On your iPhone (first time only):**

1. Go to **Settings → General → VPN & Device Management**
2. Find your developer account
3. Tap **"Trust [Your Name]"**
4. Now launch the app from your home screen

---

### 5. Future Builds

After the initial setup, to deploy new changes:

```bash
# Build web assets
npm run build

# Sync to iOS
npx cap sync ios

# Run in Xcode (or use cap run)
npx cap run ios
```

Or use Xcode's "Run" button directly if you have it open.

---

## Benefits of Native App vs PWA

Once running as a native app, you'll get:

✅ **No Safari storage limitations** - localStorage and IndexedDB won't be cleared by ITP
✅ **Persistent auth tokens** - Tokens stay valid for the full 30 days (refresh token lifetime)
✅ **Better performance** - Native shell, no browser overhead
✅ **App Store distribution** - Can distribute via TestFlight or App Store
✅ **Push notifications** - Can add later with `@capacitor/push-notifications`
✅ **Native features** - Camera, contacts, biometrics, etc. available

---

## Optional: TestFlight Distribution

To share the app with testers without cables:

1. **In Xcode:**
   - Select "Any iOS Device (arm64)" as destination
   - Go to **Product → Archive**
   - Once archived, click **Distribute App**
   - Choose **TestFlight & App Store**
   - Follow the wizard

2. **In App Store Connect:**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Your app will appear under TestFlight
   - Add internal/external testers
   - They'll receive an invitation to download via TestFlight app

---

## Optional: App Store Submission

When ready to publish:

1. Prepare App Store listing at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Add screenshots, description, privacy policy
3. Submit for review (typical review time: 1-3 days)
4. Once approved, release to App Store

---

## Troubleshooting

### "No provisioning profiles found"
- Make sure you selected a Team in Signing & Capabilities
- Enable "Automatically manage signing"
- Your Apple Developer account must be active ($99/year)

### "Untrusted Developer" on iPhone
- Go to Settings → General → VPN & Device Management
- Trust your developer certificate

### Build errors after code changes
```bash
npm run build
npx cap sync ios
```
Then rebuild in Xcode

### Deep linking not working
- Check that `simplebaby://` scheme is in Info.plist (already configured)
- Check that Cognito redirect URI includes `simplebaby://callback`

---

## Current Configuration Summary

**App Details:**
- **Bundle ID:** `com.simplebaby.app`
- **App Name:** `Simple Baby`
- **URL Scheme:** `simplebaby://`
- **Background Color:** `#18181b` (dark zinc)

**Capacitor Plugins:**
- `@capacitor/core` - Core functionality
- `@capacitor/ios` - iOS platform
- `@capacitor/app` - App state, deep linking
- `@capacitor/browser` - In-app browser for OAuth

**OAuth Configuration:**
- Redirect URI: `simplebaby://callback` (native)
- Cognito domain: Configured in `.env`
- Google auth: Supported

---

## Next Steps Checklist

- [ ] Sign up for Apple Developer Program ($99/year)
- [ ] Wait for account approval (24-48 hours)
- [ ] Run `npm run build && npx cap sync ios`
- [ ] Open Xcode with `npx cap open ios`
- [ ] Configure code signing (select Team)
- [ ] Connect iPhone via USB
- [ ] Trust computer on iPhone
- [ ] Click Run in Xcode
- [ ] Trust developer certificate on iPhone
- [ ] Launch app from home screen
- [ ] Test Google OAuth login
- [ ] Verify tokens persist across app closures

---

## Questions?

If you encounter any issues:
1. Check Xcode build logs for specific errors
2. Verify your Apple Developer account is active
3. Make sure iPhone is in Developer Mode (iOS 16+)
   - Settings → Privacy & Security → Developer Mode → Enable

---

**Document created:** 2026-01-15
**Last updated:** 2026-01-15
