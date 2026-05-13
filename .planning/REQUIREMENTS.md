# Requirements: SOLDI

**Defined:** 2026-05-13
**Core Value:** A consumer installs SOLDI from the App Store and within 90 seconds sees their own spending visualized with care — without exposing real banking credentials.

## v1 Requirements

### Onboarding

- [x] **ONBD-01**: User picks language (English or Ukrainian) during first launch
- [ ] **ONBD-02**: User chooses a data source: synthetic, manual entry, monobank token, or CSV
- [x] **ONBD-03**: User completes the full onboarding flow in under 90 seconds
- [ ] **ONBD-04**: User can opt into the FaceID/TouchID app-open gate during onboarding

### Data

- [ ] **DATA-01**: User can import transactions from a CSV file via the document picker
- [ ] **DATA-02**: User can paste a monobank personal token and have transactions synced from the monobank API
- [ ] **DATA-03**: User can manually add an individual transaction with merchant, amount, date, and category
- [ ] **DATA-04**: App seeds 90 days of realistic synthetic transactions when the user has no other data source

### Dashboard

- [ ] **DASH-01**: Dashboard displays the current month's total spend and a per-category breakdown chart
- [ ] **DASH-02**: Dashboard shows a "yesterday in money" digest card with a sparkline
- [ ] **DASH-03**: User can view current-month-vs-previous-month comparison numbers

### Transactions

- [ ] **TXN-01**: Transaction list renders at 60fps with 5000+ entries on iPhone SE 2020
- [ ] **TXN-02**: User can search transactions by merchant name and amount
- [ ] **TXN-03**: User can swipe a transaction row to open the recategorize menu
- [ ] **TXN-04**: User can edit any field of a transaction in a detail screen

### Categories

- [ ] **CAT-01**: User can view all categories and rename any of them
- [ ] **CAT-02**: User can create a custom category with name and SVG icon (no emoji)
- [ ] **CAT-03**: AI auto-categorizes every new transaction using Claude Haiku, MCC-table fallback for monobank
- [ ] **CAT-04**: User corrections to a category update the merchant-pattern table and propagate to similar transactions

### AI Chat

- [ ] **CHAT-01**: User can ask natural-language questions about their spending in a chat bottom sheet
- [ ] **CHAT-02**: AI responses arrive within 3 seconds for queries answerable from local data
- [ ] **CHAT-03**: Chat responses include a mini chart embed for aggregate answers
- [ ] **CHAT-04**: No raw transaction PII is sent to the LLM — only aggregates and category names cross the backend

### Goal Jars

- [ ] **JAR-01**: User can create a goal jar with a name, target amount, and SVG icon
- [ ] **JAR-02**: Jar progress ring animates from old value to new value when a contribution is added
- [ ] **JAR-03**: User can top up a jar via round-ups, fixed weekly amount, or percentage of income

### Settings

- [ ] **SET-01**: User can toggle the biometric app-open gate from the settings screen
- [ ] **SET-02**: User can switch the app language between EN and UK at runtime without restart
- [ ] **SET-03**: User can export all transactions and jars as a CSV file
- [ ] **SET-04**: App requires biometric on cold start when the gate is enabled

### Notifications

- [ ] **NOTIF-01**: App delivers a local push notification at 09:00 local time with "yesterday in money" digest
- [ ] **NOTIF-02**: App delivers a local push notification when a jar reaches 25%, 50%, 100% of target

### Quality

- [ ] **QUAL-01**: Every interactive element has an `accessibilityLabel` and `accessibilityRole`
- [ ] **QUAL-02**: All foreground/background color pairs meet WCAG AA contrast (4.5:1 for body, 3:1 for large text)
- [ ] **QUAL-03**: User can navigate every screen using VoiceOver without dead ends
- [ ] **QUAL-04**: All text scales with system dynamic type up to AccessibilityXXXL
- [ ] **QUAL-05**: Cold start completes in under 2 seconds on iPhone SE 2020
- [ ] **QUAL-06**: Skia chart renders the first frame in under 100ms when dashboard mounts

### Distribution

- [ ] **DIST-01**: App passes App Store Review under the Finance category with TestFlight test account provided
- [ ] **DIST-02**: At least 50 TestFlight beta users are active for 7+ consecutive days with crash-free 99.5%+
- [ ] **DIST-03**: Privacy Policy and Terms of Service are hosted publicly and linked from the App Store listing

## v2 Requirements

Deferred to post-launch milestones.

### Platform Expansion

- **AND-01**: Android Play Store release using the same RN+Expo codebase
- **DE-01**: German localization with native QA
- **FR-01**: French localization with native QA
- **DARK-01**: Dark mode using the `GRADIENTS.dark` palette

### Advanced Features

- **OCR-01**: On-device receipt OCR via expo-camera + Vision framework
- **PROJ-01**: Predictive end-of-month spending projection
- **SUB-01**: Recurring-subscription detection and price-increase alerts
- **WATCH-01**: Apple Watch companion app

### Monetization

- **PAY-01**: RevenueCat-integrated premium tier (€3.99/mo) gating multi-data-source + advanced AI
- **PAY-02**: Annual pricing tier at 30% discount

## Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| TrueLayer / GoCardless integration | Requires €5-15k legal spend; AISP agent agreement; incompatible with bootstrap |
| AISP licensing or CBI agent notification | Not applicable to a non-bank-connected app |
| Real-time bank webhooks | No bank API in v1 |
| DPO appointment / formal DPIA | Required only at large-scale Art. 9 processing; defer until 5k+ users with real bank data |
| 180-day PSD2 re-consent UX | No PSD2 connection means no consent expiry |
| Multi-aggregator abstraction layer | Single data path in v1 |
| Native Swift UI / SwiftUI components | Founder's machine is Windows; native iOS would double solo workload |
| Subscription paywall in v1 | App Store Review for Finance + paywall combos rejected more often; portfolio focus |
| Web app or browser export | iOS-first; web is a backup signal only if budget allows |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | Phase 1 | Complete |
| ONBD-02 | Phase 1 | Pending |
| ONBD-03 | Phase 1 | Complete |
| ONBD-04 | Phase 5 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| TXN-01 | Phase 2 | Pending |
| TXN-02 | Phase 2 | Pending |
| TXN-03 | Phase 2 | Pending |
| TXN-04 | Phase 2 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 3 | Pending |
| CAT-04 | Phase 3 | Pending |
| CHAT-01 | Phase 3 | Pending |
| CHAT-02 | Phase 3 | Pending |
| CHAT-03 | Phase 3 | Pending |
| CHAT-04 | Phase 3 | Pending |
| JAR-01 | Phase 4 | Pending |
| JAR-02 | Phase 4 | Pending |
| JAR-03 | Phase 4 | Pending |
| SET-01 | Phase 5 | Pending |
| SET-02 | Phase 4 | Pending |
| SET-03 | Phase 5 | Pending |
| SET-04 | Phase 5 | Pending |
| NOTIF-01 | Phase 5 | Pending |
| NOTIF-02 | Phase 5 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 4 | Pending |
| QUAL-05 | Phase 5 | Pending |
| QUAL-06 | Phase 5 | Pending |
| DIST-01 | Phase 6 | Pending |
| DIST-02 | Phase 6 | Pending |
| DIST-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-13 after initial definition*
