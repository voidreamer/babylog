# SimpleBaby Roadmap

## ✅ Already Shipped

### Core Features
- [x] Multi-baby support with switching
- [x] Feeding tracking (breast, bottle, formula)
- [x] Diaper tracking with color/consistency
- [x] Sleep tracking with active sleep detection
- [x] Pumping logs
- [x] Daily summary with Today/Yesterday comparison
- [x] Timeline view with calendar navigation

### Health & Milestones
- [x] Doctor visits logging
- [x] Vaccination records
- [x] Medication tracking (active/past)
- [x] Milestone recording
- [x] Growth records (weight/height/head)

### Sharing & Auth
- [x] Google OAuth via Cognito
- [x] Baby sharing with other users
- [x] Shared vs owned baby indicators

### Infrastructure
- [x] Staging environment
- [x] GitHub Actions CI/CD
- [x] AWS Lambda + S3/CloudFront deployment

### UI/UX
- [x] Modern widget design with time-ago display
- [x] Baby greeting card with age + encouragement
- [x] Lucide icon consistency
- [x] Settings tab with logout
- [x] Collapsible summaries

---

## 💎 Phase 2: Premium Features

### Analytics & Insights
- [ ] Weekly/Monthly Reports - Charts showing patterns
- [ ] Pattern Recognition - "Baby usually naps at 2pm"
- [ ] Export Data - PDF/CSV export

### Family Collaboration
- [ ] Caregiver Roles - View-only, log-only, full permissions
- [ ] Activity Feed - See who logged what and when
- [ ] Photo Diary - Attach photos to milestones

### Monetization
- [ ] Premium Tier ($3.99/mo or $24.99/yr)
  - Unlimited babies & caregivers
  - Advanced analytics
  - Photo storage
  - Priority support

---

## 📱 Phase 3: Native Experience

- [ ] iOS App (React Native) - App Store distribution
- [ ] Push Notifications - Feeding/medication reminders
- [ ] Offline Mode - Work without internet, sync later
- [ ] Apple Health/HealthKit - Sync weight/length data

---

## 🔧 Technical Improvements

### Performance
- [ ] Redis caching for dashboard queries
- [ ] Database indexing optimization
- [ ] Image CDN for photo uploads

### DevOps
- [x] Staging environment
- [ ] Error monitoring (Sentry)
- [ ] Automated testing (unit + e2e)

---

## 🎨 Design Polish

- [ ] Onboarding flow with animations
- [ ] Celebration animations for milestones
- [ ] Customizable accent color per baby
- [ ] Dark/Light mode toggle

---

## 💡 Ideas to Consider

- **Widget shortcuts** - Quick log buttons on home screen
- **Timer mode** - Start/stop timer for feedings/sleep
- **Notes section** - General baby notes/diary
- **Percentile charts** - Growth compared to WHO standards
- **Reminders** - "Last feeding was 4 hours ago"
- **Multi-language** - i18n support
