# ForesightFlow
Interactive financial projection sandbox built with Next.js, Tailwind CSS, and Shadcn-inspired UI components.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open http://localhost:3000 in your browser to explore the sandbox.

## Project Structure

- `app/` – Next.js App Router entry points (`layout.tsx`, `page.tsx`, global styles).
- `components/` – Reusable UI blocks including `FinancialProjectionSandbox`.
- `components/ui/` – Shadcn-inspired primitives (button, card, accordion, etc.).
- `lib/` – Utility helpers (currently Tailwind class name merger).
- `public/` – Static assets.

## Financial Projection Sandbox

The sandbox models year-by-year wealth outcomes using adjustable assumptions:

- Retirement timeline, contribution strategy, and glidepath returns.
- Core expenses including housing, travel, family support, and mortgage dynamics.
- Charts generated with Recharts and a detailed tabular view with optional inflation adjustment.

The component includes inline assertions that sanity check the projection model during development.

## Next Steps

- Customize UI theming via Tailwind tokens in `app/globals.css`.
- Extend the sandbox with scenario presets or export features.
- Deploy with `npm run build` followed by your preferred deployment workflow (Vercel, Docker, etc.).
