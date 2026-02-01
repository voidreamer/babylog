# Design Comparison: Static Concept vs Staging App

Comparing the static design concept (`babyhub/staticdesign/tracker.html`) against the **staging** tracker app at `https://staging-app.heybub.app` (source: `main` branch, which is what's currently deployed to staging).

> **Note:** The repo has no separate `staging` branch — `main` is deployed to staging. This comparison is based on the source code in `main` + verified against the live staging bundle.

## Navigation & Layout

| Feature | Concept | Staging App | Status |
|---------|---------|-------------|--------|
| Bottom tab bar (5 tabs) | ✅ Home, Timeline, Health, Insights, Settings | ✅ Home, Timeline, Health, Insights (Learn), Settings | ✅ Implemented |
| App header with back arrow + title | ✅ | ✅ Still present on staging (removed in this PR) | 🔄 This PR |
| Theme toggle in header | ✅ | ✅ Still present on staging (removed in this PR) | 🔄 This PR |
| Dark mode toggle in Settings | ✅ | ✅ Already exists | ✅ Implemented |
| Hub back link in Settings | ❌ Not in concept | ❌ Not on staging (added in this PR) | 🔄 This PR |
| Notification bell in header | ✅ | ❌ Not implemented | ❌ Missing |

## 🏠 Home Tab

| Feature | Concept | Staging App | Status |
|---------|---------|-------------|--------|
| Baby profile card (avatar, name, age, weight/height/head) | ✅ | ✅ Dashboard component | ✅ Implemented |
| Quick Log buttons (Feeding, Sleep, Diaper, Growth, Medicine, Memory) | ✅ 6 actions | ✅ Quick actions in Dashboard | ✅ Implemented |
| Today's Summary (feeds, sleep, diapers, mood tiles) | ✅ 4 tiles | ✅ Summary tiles | ✅ Implemented |
| Sleep Goal with circular progress ring + bar | ✅ SVG ring + bar chart | ⚠️ Basic progress display, no circular ring | 🔶 Partial |
| "Coming Up" section (appointments, medications) | ✅ Two preview cards | ❌ Not implemented | ❌ Missing |
| Milestones section with badges | ✅ Achievement cards + tags | ❌ Not implemented | ❌ Missing |
| Tip of the Day card | ✅ | ❌ Not implemented | ❌ Missing |
| Baby greeting ("Good morning, name") | ❌ Not in concept | ✅ BabyGreeting component | ✅ Extra |

## 📅 Timeline Tab

| Feature | Concept | Staging App | Status |
|---------|---------|-------------|--------|
| Activity timeline with date group headers | ✅ "Today, January 25" / "Yesterday" | ✅ TimelineCalendar | ✅ Implemented |
| Activity block cards (icon, title, time ago, description) | ✅ | ✅ | ✅ Implemented |
| Edit button on each entry | ✅ | ✅ | ✅ Implemented |
| "Repeat" quick-action button | ✅ On feeding/diaper entries | ❌ Not implemented | ❌ Missing |
| "Load more activity" button | ✅ | ✅ Infinite scroll / pagination | ✅ Implemented |
| Calendar date picker view | ❌ Not in concept | ✅ Calendar component | ✅ Extra |

## ❤️ Health Tab

| Feature | Concept | Staging App | Status |
|---------|---------|-------------|--------|
| Doctor visits list (upcoming / completed badges) | ✅ With color-coded badges | ⚠️ Basic health page exists | 🔶 Partial |
| Vaccination tracker with visual progress dots | ✅ 12-dot progress + next vaccine | ❌ Not implemented | ❌ Missing |
| Daily medications tracker (Vitamin D, Probiotics) | ✅ With "given today" badges | ❌ Not implemented | ❌ Missing |
| Growth charts link/card | ✅ Clickable card with arrow | ⚠️ Growth data accessible but not as dedicated card | 🔶 Partial |
| Allergies & notes section | ✅ Editable notes area | ❌ Not implemented | ❌ Missing |
| "+ Add" buttons on doctor visits / meds | ✅ | ❌ Not implemented | ❌ Missing |

## 💡 Insights Tab (called "Learn" on staging)

| Feature | Concept | Staging App | Status |
|---------|---------|-------------|--------|
| Premium upsell banner (AI Powered badge) | ✅ Gradient banner + CTA | ✅ Upgrade dialog | ✅ Implemented |
| Sleep Prediction with drowsiness/optimal nap bars | ✅ Progress bars + time prediction | ❌ Not implemented | ❌ Missing |
| Feeding Patterns (week-over-week comparison) | ✅ Formula +12%, Solids +8% | ❌ Not implemented | ❌ Missing |
| Diaper Forecast (24h estimate) | ✅ Wet/dirty count tiles | ❌ Not implemented | ❌ Missing |
| Development milestone tracker (Motor/Language/Social) | ✅ Three progress bars + percentages | ❌ Not implemented | ❌ Missing |
| AI badge styling (gradient pill) | ✅ | ❌ Not implemented | ❌ Missing |
| Educational "Learn" content | ❌ Not in concept | ✅ Learn component with articles | ✅ Extra |

## ⚙️ Settings Tab

| Feature | Concept | Staging App | Status |
|---------|---------|-------------|--------|
| Baby profile editing (name, DOB) | ✅ Clickable row | ⚠️ Only via onboarding flow | 🔶 Partial |
| Growth data entry (update weight/height) | ✅ Dedicated row | ❌ Not in settings | ❌ Missing |
| Add another baby | ✅ | ❌ Not implemented | ❌ Missing |
| Notifications toggle | ✅ With toggle switch | ❌ Not implemented | ❌ Missing |
| Dark mode toggle | ✅ With toggle switch | ✅ With toggle switch | ✅ Implemented |
| Units preference (metric / imperial) | ✅ Shows "Metric (kg, cm, ml)" | ❌ Not implemented | ❌ Missing |
| Premium plan / upgrade | ✅ With badge | ✅ With badge | ✅ Implemented |
| Caregivers / share with family | ✅ | ❌ Not implemented | ❌ Missing |
| Export data (PDF / CSV) | ✅ | ✅ CSV export (premium-gated) | ✅ Implemented |
| Help center | ✅ | ❌ Not implemented | ❌ Missing |
| Contact us | ✅ | ❌ Not implemented | ❌ Missing |
| Privacy policy | ✅ | ✅ | ✅ Implemented |
| Version number footer | ✅ "HeyBub v1.0.0" | ❌ Not shown | ❌ Missing |
| Language switcher | ❌ Not in concept | ✅ i18n language picker | ✅ Extra |
| Sign out button | ❌ Not in concept (implicit) | ✅ | ✅ Extra |

## Summary

| Status | Count |
|--------|-------|
| ✅ Fully implemented | 17 |
| 🔶 Partially implemented | 5 |
| ❌ Missing from staging | 18 |
| ✅ Extra (staging only, not in concept) | 5 |
| 🔄 Changed in this PR | 3 |

### Priority gaps (high value → low effort):
1. **Health tab** — vaccination tracker, medications, allergies (parents need this daily)
2. **Home tab** — "Coming Up" section, milestones (engagement drivers)
3. **Insights tab** — AI predictions are the premium selling point (revenue)
4. **Settings** — notifications toggle, units, multi-baby support (retention)
5. **Timeline** — "Repeat" button on entries (convenience)
6. **Home** — circular sleep progress ring, tip of the day (polish)
