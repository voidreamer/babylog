# Baby Voice — Setup & Requirements

Everything needed to get voice input working across web, iOS in-app, and Siri.

---

## Architecture Overview

```
                        ┌─────────────────────┐
  "Hey Siri, baby log"  │   Siri (built-in)   │──► Swift parser ──► API
                        └─────────────────────┘
                        ┌─────────────────────┐
  iOS mic button        │ whisper.cpp on-device│──► TS parser ──► API
                        │   (~32MB model)      │
                        └─────────────────────┘
                        ┌─────────────────────┐
  Web/PWA mic button    │ faster-whisper       │──► TS parser ──► API
                        │   (Oracle VM)        │
                        └─────────────────────┘
                                  │
                          POST /voice/log
                                  │
                        ┌─────────────────────┐
                        │  Backend dispatcher  │──► Feeding / Diaper / Sleep / etc.
                        │  (existing models)   │
                        └─────────────────────┘
```

---

## 1. Backend (Lambda / Oracle VM)

### Already done
- `POST /voice/log` endpoint in `backend/app/routers/voice.py`
- Dispatcher routes to existing models (Feeding, Diaper, Sleep, Pumping, Potty, TummyTime, Bath, Supplement)
- Registered in `main.py`
- No DB migration needed

### TODO: Transcription proxy endpoint

Add a `POST /voice/transcribe` endpoint on the backend that proxies audio to the Oracle VM transcription server. This lets the web frontend use the same API base URL.

```python
# backend/app/routers/voice.py — add this endpoint
@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...), ...):
    # Forward to Oracle VM transcription server
    # Set TRANSCRIPTION_URL and TRANSCRIPTION_SECRET as env vars
```

**Env vars needed on Lambda:**
- `TRANSCRIPTION_URL` — e.g. `http://<oracle-vm-ip>:8000`
- `TRANSCRIPTION_SECRET` — shared secret for the transcription server

---

## 2. Oracle VM Transcription Server

### Deploy

```bash
# SSH into your Oracle Cloud A1 instance
cd /opt
git clone <repo> babylog
cd babylog/oracle-vm/transcription-server

# Set the shared secret
echo "TRANSCRIPTION_SECRET=your-secret-here" > .env

# Build and start
docker compose up -d --build

# Verify
curl http://localhost:8000/health
```

### Model
- Uses `faster-whisper` with `base` multilingual model (142MB)
- Supports all 7 app languages
- ~1-2s for short phrases on ARM (A1 Flex)

### Network
- Open port 8000 in OCI security list (or use a reverse proxy)
- The backend (Lambda or co-hosted) calls this endpoint internally
- Web clients never call this directly — always through the backend proxy

---

## 3. iOS — whisper.cpp (On-Device STT)

### Xcode project setup

#### 3a. Build whisper.cpp xcframework

```bash
# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp

# Download the quantized tiny model for English
bash models/download-ggml-model.sh tiny.en-q5_1

# Build the xcframework (iOS + iOS Simulator)
# This creates whisper.xcframework in the current directory
mkdir build-ios && cd build-ios
cmake .. -G Xcode \
  -DCMAKE_SYSTEM_NAME=iOS \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=16.0 \
  -DBUILD_SHARED_LIBS=OFF \
  -DWHISPER_BUILD_EXAMPLES=OFF \
  -DWHISPER_BUILD_TESTS=OFF

# Or use the project's build script if available:
# ./build-xcframework.sh
```

#### 3b. Add to Xcode project

1. In Xcode, select the **App** target
2. **General → Frameworks, Libraries, and Embedded Content** → Add `whisper.xcframework`
3. Set embed to **"Embed & Sign"**

#### 3c. Bundle the model file

1. Drag `ggml-tiny.en-q5_1.bin` (~32MB) into the Xcode project navigator
2. Ensure it's checked in **Build Phases → Copy Bundle Resources**
3. Target membership: **App**

#### 3d. Add Swift/ObjC plugin files to target

These files are already created but need to be added to the Xcode project:

- `ios/App/App/Plugins/WhisperPlugin.swift`
- `ios/App/App/Plugins/WhisperPlugin.m`

Select each file → **File Inspector → Target Membership** → check **App**

#### 3e. Complete the whisper.cpp integration

The `WhisperPlugin.swift` file has a `transcribe(samples:)` method with TODO comments.
Once the xcframework is linked, replace the placeholder with actual whisper.cpp C API calls:

```swift
private func transcribe(samples: [Float]) -> String {
    guard let modelPath = Bundle.main.path(forResource: "ggml-tiny.en-q5_1", ofType: "bin") else {
        return ""
    }
    let ctx = whisper_init_from_file(modelPath)
    defer { whisper_free(ctx) }

    var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
    params.n_threads = 4
    params.language = "en".withCString { $0 }

    samples.withUnsafeBufferPointer { ptr in
        whisper_full(ctx, params, ptr.baseAddress, Int32(samples.count))
    }

    var transcript = ""
    let nSegments = whisper_full_n_segments(ctx)
    for i in 0..<nSegments {
        if let text = whisper_full_get_segment_text(ctx, i) {
            transcript += String(cString: text)
        }
    }
    return transcript.trimmingCharacters(in: .whitespacesAndNewlines)
}
```

#### 3f. Info.plist entries

Add to `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>HeyBub uses the microphone for voice logging of baby events</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>HeyBub uses speech recognition to understand voice commands</string>
```

---

## 4. iOS — Siri Shortcuts (AppIntents)

### Xcode capabilities

1. Select **App** target → **Signing & Capabilities**
2. Click **+ Capability** → add **Siri**
3. Click **+ Capability** → add **App Groups**
4. Set App Group identifier: `group.com.heybub.app`

### Add Swift files to target

These files are already created but need Xcode target membership:

```
ios/App/App/Plugins/KeychainPlugin.swift
ios/App/App/Plugins/KeychainPlugin.m
ios/App/App/Voice/VoiceEventParser.swift
ios/App/App/Voice/HeyBubAPIClient.swift
ios/App/App/Voice/PendingEventQueue.swift
ios/App/App/Voice/Intents/LogBabyEventIntent.swift
ios/App/App/Voice/Intents/QuickFeedIntent.swift
ios/App/App/Voice/Intents/QuickDiaperIntent.swift
ios/App/App/Voice/Intents/QuickSleepIntent.swift
ios/App/App/Voice/Intents/BabyAppShortcuts.swift
```

### Info.plist entries

```xml
<key>NSSiriUsageDescription</key>
<string>HeyBub uses Siri to let you log baby events hands-free</string>

<!-- API configuration for Siri intents -->
<key>HEYBUB_API_URL</key>
<string>https://api.heybub.app/api</string>
<key>SUPABASE_URL</key>
<string>$(VITE_SUPABASE_URL)</string>
<key>SUPABASE_ANON_KEY</key>
<string>$(VITE_SUPABASE_ANON_KEY)</string>
```

### How Siri shortcuts work

After building and running the app:
- Shortcuts appear automatically in the **Shortcuts** app
- Users can say: "Hey Siri, log baby event with HeyBub"
- Siri asks "What happened?" → user says "bottle 4 ounces"
- Swift parser processes → API call → spoken confirmation

### Auth flow for Siri

1. User signs in to HeyBub normally (Google OAuth)
2. `useAuth.tsx` detects session change → writes JWT to Keychain via `KeychainPlugin`
3. `useBaby.tsx` detects baby selection → writes active baby to App Group UserDefaults
4. Siri intents read from Keychain/UserDefaults (same app process on iOS 16+)
5. If token expires, `HeyBubAPIClient.swift` refreshes via Supabase REST API
6. If offline, events queue to `PendingEventQueue` → sync on next app foreground

---

## 5. Lambda → Oracle Cloud Migration

### Would it change anything?

**Yes — it simplifies the architecture significantly.** If you move the FastAPI backend from Lambda to the Oracle Cloud A1 VM (4 ARM CPUs, 24 GB RAM), you can run everything on one machine:

```
Current (Lambda + Oracle VM):            Migrated (single Oracle VM):
┌──────────┐   ┌──────────────┐          ┌─────────────────────────┐
│  Lambda  │   │  Oracle VM   │          │      Oracle VM          │
│  FastAPI │──►│  faster-     │   ──►    │  FastAPI + faster-      │
│  + Mangum│   │  whisper     │          │  whisper (co-located)   │
└──────────┘   └──────────────┘          └─────────────────────────┘
```

#### What changes

| Aspect | Lambda (current) | Oracle VM (migrated) |
|--------|-----------------|---------------------|
| Transcription | Separate server, needs proxy | Same process, no network hop |
| Cold starts | Lambda cold starts with FastAPI + SQLAlchemy | Zero — always running |
| Whisper model | Can't run on Lambda (too large, too slow on cold start) | Loaded once, stays in memory |
| Cost | Free tier → then ~$5-20/mo at scale | Always free (4 CPU, 24GB RAM, 10TB egress) |
| Scaling | Auto-scales | Single VM, but 24GB RAM handles many concurrent users |
| Deployment | Zip/container → Lambda | Docker compose or systemd |
| Database | Needs external DB (Supabase/RDS) | Can run Postgres locally or keep Supabase |
| SSL/TLS | API Gateway handles it | Need Caddy/nginx reverse proxy (use the free E2.1.Micro) |

#### whisper.cpp vs faster-whisper on Oracle VM

If the backend is co-located on the same ARM VM:

| Engine | Pros | Cons |
|--------|------|------|
| **faster-whisper** (Python) | Same language as FastAPI, easy integration, multilingual, INT8 on ARM | ~142MB for base model, slightly higher RAM |
| **whisper.cpp** (C/C++) | Fastest inference, lowest RAM, NEON acceleration on ARM | Needs C binding, harder to integrate in Python |

**Recommendation:** Use **faster-whisper** on the Oracle VM. It's already set up in `oracle-vm/transcription-server/`, integrates trivially with FastAPI, and the performance difference is negligible for short voice clips (~1-2 seconds of audio). If you migrate the full backend, just merge the `/transcribe` endpoint into `main.py` — no separate service needed.

#### Migration checklist (if you decide to move)

- [ ] Provision A1 Flex instance (4 OCPU, 24GB RAM) — may need retries for capacity
- [ ] Install Docker + Docker Compose
- [ ] Set up Caddy on E2.1.Micro for TLS termination (free Let's Encrypt)
- [ ] Point DNS to Oracle VM public IP
- [ ] Deploy FastAPI via Docker (remove Mangum wrapper, use uvicorn directly)
- [ ] Merge transcription server into main app (or keep separate containers)
- [ ] Keep Supabase for auth (just update API URLs)
- [ ] Update GitHub Actions to deploy to Oracle VM instead of Lambda
- [ ] Update CORS origins
- [ ] Set up systemd or Docker restart policies for reliability
- [ ] Set up a simple health check / keepalive to avoid idle reclamation (Oracle stops VMs with <20% CPU over 7 days)

#### Oracle Cloud gotchas

- **"Out of Host Capacity"** — A1 instances are popular; you may need to retry provisioning. Use [oci-arm-host-capacity](https://github.com/hitrov/oci-arm-host-capacity) script or try less popular regions
- **Idle reclamation** — Oracle stops Always Free VMs if CPU <20% for 7 days. A cron job or real traffic prevents this
- **Single VM = single point of failure** — acceptable for a small app, but no built-in HA
- **Upgrade to Pay-As-You-Go** to avoid capacity issues — you're only billed if you exceed Always Free limits (which you won't with this workload)

---

## 6. Testing Checklist

### Phase 0A — Backend dispatcher
```bash
# Test feeding
curl -X POST https://your-api/api/voice/log \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"baby_id": 1, "event_type": "feeding", "feed_type": "bottle", "amount_ml": 120}'

# Test sleep end
curl -X POST https://your-api/api/voice/log \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"baby_id": 1, "event_type": "sleep", "sleep_action": "end"}'
```

### Phase 0B — Transcription server
```bash
# Record a short audio clip and test
curl -X POST http://oracle-vm:8000/transcribe \
  -H "X-Transcription-Secret: your-secret" \
  -F "audio=@test.webm"
```

### Phase 1 — Voice parser
```bash
cd frontend && npx vitest run src/utils/__tests__/voiceParser.test.ts
```

### Phase 2 — In-app voice (web)
1. Open app in browser
2. Tap mic button on dashboard
3. Say "bottle 4 ounces"
4. Verify confirmation card shows "Feeding (bottle) 118ml"
5. Tap confirm → event appears in timeline

### Phase 2 — In-app voice (iOS)
1. Build app in Xcode with whisper.xcframework linked
2. Tap mic button
3. Say "wet diaper"
4. Should transcribe on-device (no network needed)
5. Confirmation card → confirm → event logged

### Phase 3 — Siri
1. Build app with Siri capability
2. Say "Hey Siri, log baby event with HeyBub"
3. Siri asks "What happened?"
4. Say "bottle 4 ounces"
5. Siri responds "Logged for Baby: Bottle feeding 120ml"
6. Test offline: airplane mode, same flow → "Saved offline"
7. Re-open app → pending event syncs
