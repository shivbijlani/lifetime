# Rent vs Buy + Invest (Dubai) — Dev Spec

## Architecture & Isolation
- Create a **new module/route** (e.g., `/rent-vs-buy` or feature-flagged entry point) that does not change legacy calculator code paths.
- Shared UI components (cards, tables, buttons) may be reused, but all new business logic should be namespaced under a new directory (e.g., `lib/rent-vs-buy/`).
- Scenario persistence should reuse the existing saving infrastructure but with a **new scenario type key/namespace** so legacy data remains untouched.
- Introduce a feature flag and/or top-level toggle to enter/exit the new calculator without altering legacy state.

## Data Model
- **ScenarioA (Buy)** inputs: purchasePrice, downPaymentPct, mortgageRate, amortizationYears, holdYears, appreciationPct, serviceCharge, serviceChargeGrowthPct, fees (optional).
- **ScenarioB (Rent+Invest)** inputs: startRent, rentGrowthPct, investmentReturnPct, investmentFeePct, holdYears (share with A), reinvestSavings (boolean).
- **Shared**: currency (default AED), title/name, createdAt/updatedAt.
- **Derived outputs** per scenario:
  - totalCashOutflow
  - equityAtHorizon (Scenario A)
  - portfolioAtHorizon (Scenario B)
  - netWealth
  - yearlyBreakdown[] with: year, cashOutflow, equity/portfolio, remainingLoan (A), rent (B), contribution (B), appreciation (A), serviceCharge, cumulativeInvested (B).

## Calculation Notes
- Mortgage payment: fixed-rate amortization using standard annuity formula.
- Property appreciation: compounded annually.
- Service charges: grow annually by `serviceChargeGrowthPct`.
- Rent: grows annually by `rentGrowthPct`.
- Investment: contributions are added at end of each year and grow at `investmentReturnPct - investmentFeePct` net annual rate until horizon. Negative differences contribute 0.
- Net wealth:
  - Scenario A: equityAtHorizon − totalCashOutflow.
  - Scenario B: portfolioAtHorizon − totalRentPaid.
- Winner: scenario with greater net wealth; handle ties.

## UX & Feature Parity
- Use the **existing calculator layout**: two-column comparison, headline cards for totals, and year-by-year tables.
- Preserve the **scenario saving** UI/flows; add a new preset for the provided Dubai example.
- Support export/share/download matching the legacy feature set (PDF/CSV/URL share as applicable in current app).

## Routing & Feature Flagging
- Add a dedicated route/component for the new calculator.
- Gate rendering behind a feature flag (env or remote config). Default off in production until QA completes.
- Provide an explicit navigation entry point labeled “Rent vs Buy (Dubai)” without altering existing calculator navigation order.

## Testing & Quality
- Unit tests for calculation functions (loan schedule, appreciation, rent growth, investment future value, net wealth selection).
- Integration tests for scenario saving/loading to ensure namespace separation and legacy compatibility.
- Visual regression check to confirm existing components render unchanged when the new feature is off.
- Data validation on inputs with sensible bounds and defaults.

## Analytics & Telemetry
- Track calculator open, scenario save, comparison completion, and winner outcome events under a new event namespace.
- Monitor errors and calculation time; alert on regressions relative to legacy baseline.

## Deployment & Migration
- No migrations to legacy data; new scenario type stored separately.
- Rollout plan: enable flag for internal QA → staged rollout → full release after regression checks.
