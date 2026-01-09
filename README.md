# Lifetime
Because peace of mind is worth planning for. Lifetime lets you explore long-term finances with adjustable income, savings, and inflation assumptions. Built with Next.js, Tailwind CSS, and shadcn-inspired UI primitives.

> To rebrand the app, edit `lib/branding.ts`. UI text and metadata read from those constants, so the rest of the code stays unchanged.

## Getting Started

```bash
npm install
npm run dev
# visit http://localhost:3000
```

When exporting for GitHub Pages, set `NEXT_PUBLIC_BASE_PATH=/lifetime` (or your repository name) before running `npm run export`. If you use a custom domain, set `NEXT_PUBLIC_BASE_PATH=/` or run `CUSTOM_DOMAIN=yourdomain.com npm run export` to emit root-relative assets. The deploy script will fail if `NEXT_PUBLIC_BASE_PATH` is not set for project pages.

## Project Structure

- `app/` – App Router entry points (`layout.tsx`, `page.tsx`, global styles).
- `components/` – UI, including the generic `App` experience.
- `components/ui/` – shadcn-inspired primitives (button, card, accordion, etc.).
- `lib/` – Utility helpers (e.g., Tailwind class name merger).
- `public/` – Static assets.

## Model Highlights

The model simulates yearly wealth through retirement using configurable:

- Contributions, income, and retirement timing.
- Housing costs, travel, family support, and mortgage payoff schedules.
- Asset growth assumptions, including optional glidepath returns.
- Inflation-adjusted charts (Recharts) and detailed tables.

## Next Steps

- Tailor theming via Tailwind tokens in `app/globals.css`.
- Add scenario presets or export tools for sharing results.
- Deploy with `npm run build` or static export + GitHub Pages.
