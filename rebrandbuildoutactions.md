# Rebrand Build Actions — stayd-app-branding applied to banda

## Overview

Applied the full stayd brand identity to the banda app, replacing generic Tailwind defaults (blue-600 primary, Inter font, no custom theme) with the stayd design system: racing green + bright green color palette, Plus Jakarta Sans + JetBrains Mono fonts, SVG logos, and consistent design tokens. The project uses **Tailwind CSS v4** (`@import "tailwindcss"` in CSS, `@theme` directive), so all brand tokens were defined in CSS rather than a v3 `tailwind.config.ts` preset.

TypeScript compiles clean (`npm run build` passes with zero errors across all 27 routes). Zero `blue-` class references remain in any `.tsx` file.

---

## Brand Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-brand` | `#00402E` (racing green) | Primary buttons, links, focus rings |
| `--color-brand-light` | `#005C42` | Hover states |
| `--color-brand-dim` | `rgba(0,64,46,0.10)` | In-progress badges, subtle backgrounds |
| `--color-brand-mid` | `rgba(0,64,46,0.25)` | Medium-emphasis backgrounds |
| `--color-accent` | `#00E5A0` (bright green) | Accent highlights, theme color |
| `--color-accent-dim` | `rgba(0,229,160,0.13)` | Accent badge backgrounds |
| `--color-surface` | `#f8f9fa` | Page background |
| `--color-surface-card` | `#ffffff` | Card background |
| `--color-surface-border` | `#e5e7eb` | Card/photo borders |
| `--color-status-pass` | `#00E5A0` | Complete status badges |
| `--color-status-flag` | `#ffa726` | Open/warning status badges |
| `--color-status-critical` | `#ff4757` | Flagged/error badges |
| `--radius-card` | `12px` | Card border radius |
| `--radius-btn` | `8px` | Button border radius |
| `--radius-badge` | `20px` | Badge border radius |
| `--font-sans` | Plus Jakarta Sans | Body text |
| `--font-mono` | JetBrains Mono | Code/monospace |

---

## Files Created (11 new)

### Brand Assets — Logos

| File | Description |
|------|-------------|
| `public/brand/stayd-horizontal-black.svg` | Horizontal logo, dark variant (used in nav) |
| `public/brand/stayd-horizontal-white.svg` | Horizontal logo, light variant |
| `public/brand/stayd-icon-colour.svg` | Icon-only logo, colour |
| `public/brand/stayd-icon-white.svg` | Icon-only logo, white |
| `public/brand/stayd-stacked-black.svg` | Stacked logo, dark variant |
| `public/brand/stayd-stacked-white.svg` | Stacked logo, light variant |

### UI Components

| File | Description |
|------|-------------|
| `src/components/ui/button.tsx` | Brand-styled button component with variant support |
| `src/components/ui/card.tsx` | Brand-styled card component |
| `src/components/ui/badge.tsx` | Brand-styled badge component |
| `src/components/ui/stayd-logo.tsx` | Logo component wrapping SVG assets |

### Config

| File | Description |
|------|-------------|
| `vitest.config.ts` | Vitest configuration (unrelated, pre-existing in working tree) |

---

## Files Modified (16 existing)

### Core Config & Layout

| File | Change |
|------|--------|
| `src/app/globals.css` | Added `@theme` block with all brand design tokens (colors, fonts, radii). Added `@layer base` with tap-highlight and safe-area-inset rules. |
| `src/app/layout.tsx` | Replaced `Inter` with `Plus_Jakarta_Sans` + `JetBrains_Mono` via `next/font/google`. Added CSS variables `--font-jakarta` and `--font-jetbrains` on `<html>`. Added `viewport` export with `themeColor: '#00E5A0'`. Changed body from `bg-gray-50` to `bg-surface`. |
| `src/components/nav.tsx` | Replaced text logo with SVG logo via `next/image` pointing to `/brand/stayd-horizontal-black.svg`. Replaced `bg-blue-600` / `hover:bg-blue-700` on buttons and avatar with `bg-brand` / `hover:bg-brand-light`. |

### Pages — Systematic Class Replacements

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Hero CTA button, feature card icon backgrounds, footer logo — all rebranded. Feature icons use `bg-brand-dim`, `bg-accent-dim`, `bg-brand-mid`. |
| `src/app/dashboard/page.tsx` | Card hover rings, get-started callout link, all `blue-` references replaced with brand tokens. |
| `src/app/login/page.tsx` | Submit button, focus rings on inputs, "Register" link — all rebranded. |
| `src/app/register/page.tsx` | Submit button, focus rings on inputs, "Sign in" link — all rebranded. |
| `src/app/properties/page.tsx` | Add property button, card hover states, empty state CTA — all rebranded. |
| `src/app/properties/new/page.tsx` | Submit button, focus rings on all 5 inputs, card container — all rebranded. |
| `src/app/properties/[id]/page.tsx` | "Manage areas" link, empty state links, card containers (area rows, sidebar stats) — all rebranded. |
| `src/app/properties/[id]/edit/page.tsx` | Submit button, focus rings on 5 inputs, checkbox color, card container — all rebranded. |
| `src/app/properties/[id]/areas/page.tsx` | Add/save buttons, focus rings, area cards, delete modal — all rebranded. |
| `src/app/turnovers/page.tsx` | New turnover button, status badges (open/in_progress/complete/flagged), property links, table card — all rebranded. |
| `src/app/turnovers/new/page.tsx` | Submit button, focus rings on 5 inputs, "add property" link, card container — all rebranded. |
| `src/app/turnovers/[id]/page.tsx` | Upload button, status badges, empty state card, "upload photos" link — all rebranded. |
| `src/app/turnovers/[id]/photo-grid.tsx` | Spinner `border-t-blue-600` → `border-t-brand`. Photo container `ring-gray-200` → `ring-surface-border`. |
| `src/app/upload/page.tsx` | Empty state card, property cards, status badges, links — all rebranded. |
| `src/app/upload/[propertyId]/[turnoverId]/page.tsx` | Upload button, progress bar, drop zone hover, upload item cards, status text, retry link, focus rings — all rebranded. |

---

## Systematic Replacements Applied

### Colors

| Old class | New class |
|-----------|-----------|
| `bg-blue-600` | `bg-brand` |
| `hover:bg-blue-700` | `hover:bg-brand-light` |
| `text-blue-600` | `text-brand` |
| `hover:text-blue-500` | `hover:text-brand-light` |
| `focus:border-blue-500` | `focus:border-brand` |
| `focus:ring-blue-500` | `focus:ring-brand` |
| `text-blue-600` (checkbox) | `text-brand` |
| `border-t-blue-600` (spinner) | `border-t-brand` |
| `bg-blue-600` (progress bar) | `bg-brand` |
| `hover:border-blue-400 hover:bg-blue-50` (drop zone) | `hover:border-brand/40 hover:bg-brand-dim` |

### Status Badges

| Status | Old | New |
|--------|-----|-----|
| Open | `bg-yellow-100 text-yellow-800` | `bg-status-flag/20 text-status-flag` |
| In progress | `bg-blue-100 text-blue-800` | `bg-brand-dim text-brand` |
| Complete | `bg-green-100 text-green-800` | `bg-status-pass/20 text-status-pass` |
| Flagged | `bg-red-100 text-red-800` | `bg-status-critical/20 text-status-critical` |

### Surfaces & Radii

| Old class | New class |
|-----------|-----------|
| `bg-gray-50` (page bg) | `bg-surface` |
| `bg-white` (card bg) | `bg-surface-card` |
| `ring-gray-200` (card border) | `ring-surface-border` |
| `rounded-lg` (cards) | `rounded-card` |
| `rounded-md` (buttons) | `rounded-btn` |

---

## Key Design Decisions

1. **Tailwind v4 `@theme` over v3 preset** — the branding repo provides a v3-style preset, but banda uses Tailwind v4. All tokens were translated into `@theme` CSS custom properties, which Tailwind v4 automatically picks up as utility classes.
2. **Racing green for primary actions** — all primary buttons use `bg-brand` (#00402E) rather than bright green accent, per user preference. Accent green is reserved for status indicators and highlights.
3. **Status badge palette** — moved from generic Tailwind color classes (yellow-100, blue-100, green-100, red-100) to semantic status tokens (status-flag, brand-dim, status-pass, status-critical) for consistency and easier future theming.
4. **Font loading via next/font/google** — Plus Jakarta Sans and JetBrains Mono are loaded as CSS variable fonts with `next/font/google`, avoiding FOUT and ensuring fonts are self-hosted.
5. **Custom border radius tokens** — cards use `rounded-card` (12px) and buttons use `rounded-btn` (8px) via `@theme` custom properties, giving a softer, more polished look than Tailwind's default `rounded-lg` (8px) and `rounded-md` (6px).
