# CashWise — Cash Reserve Optimization & Working Capital Forecast

CashWise is a cash reserve optimization and working-capital forecasting platform designed for SME business founders, finance managers, and chartered accountants. It translates balance-sheet figures into actionable operational decisions: how much cash to keep in current accounts, how much to invest in liquid mutual funds or short FDs, and exactly when cash shortfalls or reserve breaches are projected.

---

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite, Recharts, Three.js, Lucide Icons
- **Backend**: Node.js, Express (`server.ts`), tsx
- **Cloud & Auth**: Firebase Auth, Cloud Firestore (`firestore.rules`)
- **Offline / Fallback**: LocalStorage with automated schema versioning (Schema v2)
- **Testing**: Node.js Test Runner with `tsx --test`

---

## Phase 1: Dashboard Clarity & Working Capital Enhancements

1. **Headline Summary Card in Plain Language**:
   - Executive briefing: e.g., *"Runway: 56 days. Safe surplus: ₹2.0 lakh. Next risk: balance below reserve on 14 Dec."*
   - Generated centrally via `generateHeadlineSummary(metrics, transactions, language)` in `src/utils/finance.ts`.
2. **Streamlined 4-KPI Executive Dashboard**:
   - Main dashboard reduced to 4 primary metrics:
     1. **Current Balance** (total liquid cash in operative current accounts)
     2. **Cash Runway** (days of cash survival based on daily operating burn rate)
     3. **Safe Surplus** (free cash above the non-negotiable minimum safety reserve)
     4. **Next Shortfall Date** (projected date of next reserve buffer breach or cash deficit)
   - Secondary modules and charts moved into a clean, collapsible **"More details"** section (Runway Health Meter, Smart Recommendation Engine, Income vs Expenses Chart, 30-Day Forward Cash Projection Chart, Upcoming Outflows, Recent Ledger Activity).
3. **Standardized Status Badges (Icon + Word + Color)**:
   - Three distinct status tiers:
     - **Healthy** (`CheckCircle2` + "Healthy", Emerald)
     - **Watch** (`AlertTriangle` + "Watch", Amber)
     - **Critical** (`AlertOctagon` + "Critical", Rose)
4. **Interactive Financial Info Tooltips (`InfoTooltip`)**:
   - Added `(i)` accessible tooltip popovers on all core terms:
     - **Burn Rate**: Daily and monthly operating expenditure rate
     - **Cash Runway**: Days of operational survival at zero revenue
     - **Safe Surplus**: Free cash deployable to liquid yield
     - **DSO (Days Sales Outstanding)**: Time taken to collect credit invoices
     - **CapEx (Capital Expenditure)**: Outflows on long-term physical assets & machinery
     - **Minimum Reserve**: 3-month safety buffer for payroll and rent
     - **Current Balance**: Immediate liquid operative capital
     - **Working Capital**: Operating cash flow timing buffer
   - Main labels strictly use standard finance terms.
   - Hinglish is an optional toggle stored in user settings.
5. **Screen-Ending "Recommended Next Action" Card**:
   - Every view (`dashboard`, `cashflow`, `forecast`, `vault3d`) concludes with an action card recommending the highest-leverage decision based on real-time liquidity health.

---

## Phase 2: Onboarding, Bank Accounts & Data Import

6. **3-Step First-Run Setup Wizard (`OnboardingWizardModal`)**:
   - **Step 1: Opening Balance & Primary Operating Account**:
     - Custom amount input with benchmark Indian SME presets (₹1.5L, ₹3.5L, ₹5.0L, ₹10L).
     - Configure primary bank name (HDFC, ICICI, SBI, etc.), nickname, account type (Current, Savings, Overdraft, Cash), and masked number.
   - **Step 2: Non-Negotiable Minimum Safety Reserve**:
     - 3-month operating expenditure safety buffer setting with benchmark presets.
     - Live reactive calculation previewing deployable safe surplus or working capital deficit.
   - **Step 3: Initial Ledger Seeding & Import Options**:
     - **Load Sample Data**: Populates 18 realistic transactions for *Apex Craft Digital LLP* (client milestone payments, payroll, rent, GST, SaaS).
     - **Import Bank Statement (CSV / Excel)**: Seamlessly transitions into statement mapper.
     - **Start Fresh**: Clean ledger with opening balance.
   - **Persistence**: Writes `onboardingCompleted: true` into `cashwise_settings`, Cloud Firestore (`users/{uid}/settings/cashReserve`), and Express server. Can be relaunched anytime via Navbar **Setup Wizard** button.

7. **CSV / Excel Import with Column Mapping & Live Validation (`CSVImportModal`)**:
   - **Column Mapping**: Auto-detects and suggests matches for:
     - Date column (`dateColumn`)
     - Narration / Description column (`descriptionColumn`)
     - Debit / Outflow column (`debitColumn`)
     - Credit / Inflow column (`creditColumn`)
     - Category column (`categoryColumn`, with automated smart category inference for Indian SME transactions)
   - **Per-Row Validation Preview Table**:
     - Server route execution on `POST /api/import/validate` with identical client parity fallback.
     - Detects and flags per-row errors (invalid date strings, negative/zero amounts, character limits).
     - Filter tabs: *All Rows*, *Valid Only*, and *Errors Only*.
     - Batch import via `POST /api/import/batch` into selected bank account.
   - **Preserved UTF-8 BOM CSV Export (`ExportCSVModal`)**:
     - Existing UTF-8 Byte Order Mark (`\uFEFF`) CSV export preserved with running balance, executive summary, and filter options.

8. **Multiple Bank Accounts & Consolidated Total Cash Position (`BankAccountsModal`)**:
   - **Accounts Collection**:
     - Firestore path: `users/{userId}/accounts/{accountId}` validated by `isValidBankAccount` rule.
     - LocalStorage key: `cashwise_accounts`.
   - **Transaction Attribution & Migration**:
     - Every transaction carries `accountId` referencing its respective bank account.
     - Existing transactions without an `accountId` are automatically attributed to the default account (`acc-primary`) during runtime migration.
   - **Total Cash Position First with Breakdown**:
     - Prominent executive card showing consolidated balance across all active accounts first.
     - Per-account breakdown cards displaying live current balance, total account inflows/outflows, transaction counts, and color accents.
     - Filter transactions by account in CashFlow view.

---

## Data Model & Schema Migration

### LocalStorage Schema (Version 2)
```json
{
  "cashwise_schema_version": "2",
  "cashwise_settings": {
    "minCashRequired": 300000,
    "initialBalance": 350000,
    "language": "en",
    "schemaVersion": 2,
    "onboardingCompleted": true,
    "primaryAccountId": "acc-primary",
    "updatedAt": "2026-10-28T18:00:00.000Z"
  },
  "cashwise_accounts": [
    {
      "id": "acc-primary",
      "name": "Primary Operating Current A/c",
      "bankName": "HDFC Bank",
      "accountType": "current",
      "accountNumberMasked": "•••• 4092",
      "initialBalance": 350000,
      "isDefault": true,
      "color": "#10b981"
    }
  ],
  "cashwise_language": "en"
}
```

### Firestore Document Model & Rules
- Path: `users/{userId}/settings/cashReserve` (settings)
- Path: `users/{userId}/accounts/{accountId}` (bank accounts)
- Path: `users/{userId}/transactions/{transactionId}` (ledger transactions with `accountId`)

---

## Backend API Specification (`server.ts`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health status and version info | No |
| `GET` | `/api/finance/terms` | Standard financial glossary and definitions | No |
| `POST` | `/api/finance/metrics` | Computes health metrics, headline summary, shortfall info | Optional Bearer |
| `GET` | `/api/user/settings` | Fetches active user settings and language preference | Optional Bearer |
| `POST` | `/api/user/settings` | Updates language ('en' \| 'hinglish'), reserve, and onboarding | Optional Bearer |
| `GET` | `/api/accounts` | Fetches user bank accounts | Optional Bearer |
| `POST` | `/api/accounts` | Adds a new bank account with validation | Optional Bearer |
| `POST` | `/api/import/validate` | Parses raw CSV, applies column mapping, returns per-row validation | Optional Bearer |
| `POST` | `/api/import/batch` | Batch creates transactions assigned to target bank account | Optional Bearer |

---

## Running the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (35 tests covering calculations, validation, server routes, E2E sync, CSV import, accounts)
npm test

# 3. Type check
npm run lint

# 4. Production build verification
npm run build

# 5. Start dev server (Express backend + Vite client)
npm run dev
```
