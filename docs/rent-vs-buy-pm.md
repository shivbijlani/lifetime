# Rent vs Buy + Invest (Dubai) — PM Spec

## Goals
- Give Dubai-based users a side-by-side comparison of buying versus renting while investing the difference.
- Preserve the existing calculator experience: same visual design system, same scenario-saving/sharing flows, no regressions to the current calculator.
- Keep implementation isolated so the legacy calculator continues to behave identically.

## User Problems
- Unsure whether buying or renting (and investing) is financially better over a decade.
- Need to experiment with different appreciation, mortgage, rent growth, and investment return assumptions without losing previous scenarios.
- Want to quickly understand cash outflows, equity/portfolio growth, and net wealth at 10 years.

## Personas
- **Prospective buyers relocating to Dubai** seeking clarity on mortgage versus rent tradeoffs.
- **Investors** comparing real-estate equity to ETF returns.
- **Agents/advisors** saving and sharing scenarios with clients.

## Scenarios to Support
1. **Default Dubai condo example** mirroring the sample provided.
2. **High appreciation / low rent growth** (buy may win).
3. **High rent growth / strong ETF returns** (rent+invest may win).
4. **Custom inputs** for down payment %, mortgage rate/term, rent growth, service charges, appreciation, and investment return.

## Requirements
### Functional
- Two-column, side-by-side results for **Scenario A (Buy)** and **Scenario B (Rent + Invest)**.
- Inputs:
  - Purchase price, down-payment %, mortgage rate, amortization term, holding period (default 10 yrs), expected appreciation %, annual service charge + growth %, purchase taxes/fees (if any).
  - Starting annual rent, annual rent growth %, investment return %, annual investment fee %, and whether to reinvest rent savings automatically.
- Outputs (per scenario):
  - Total cash outflow over the horizon.
  - Equity at end of horizon (property value − remaining loan) for Buy.
  - Portfolio value for Rent+Invest (with year-by-year contributions and growth).
  - Net wealth (equity or portfolio − cash outflow) and winner badge.
- Year-by-year table for both scenarios with the ability to export/share/snapshot a scenario.
- Scenario saving: same UX and storage as the current calculator; saved scenarios remain compatible with the existing feature and are namespaced so legacy scenarios remain unchanged.
- Non-destructive: toggling between legacy calculator and this experiment does not mutate saved legacy scenarios or default presets.

### Non-Functional
- **Isolation:** new calculator lives behind its own route/feature flag and does not alter legacy calculator logic or data.
- **Performance:** calculations update within 200ms on modern devices for typical inputs.
- **Internationalization:** copy ready for localization; currency formatted in AED by default.
- **Accessibility:** meets WCAG AA for contrast and keyboard navigation.

## Success Metrics
- At least 30% of users who open the calculator complete a side-by-side comparison.
- No regression in legacy calculator conversion or error rates.
- Positive qualitative feedback on clarity of the comparison.

## Acceptance Criteria
- Users can configure both scenarios independently and view results side by side.
- Saved scenarios can be reopened with all inputs/output states restored.
- Switching between legacy and new calculator preserves legacy data.
- Visual style matches current calculator components (typography, cards, tables, CTA buttons).
- Winner clearly indicated with a badge or highlight; tie handled gracefully.

## Open Questions / Follow-ups
- Confirm default purchase fees/closing costs for Dubai (currently omitted).
- Do we allow partial prepayments or lump-sum payments? (assumed **no** for v1.)
- Should we surface sensitivity toggles (±1–2% on appreciation/returns)?
