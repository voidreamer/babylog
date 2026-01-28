# Baby Tracker Theme System

## Overview

The Baby Tracker uses a warm, pastel-based design system inspired by soft nursery aesthetics. The theme features two modes — **Light** and **Dark** — toggled via the header sun/moon icon or the Settings page.

Fonts: **Nunito** (body) and **Quicksand** (headings) from Google Fonts. Both are rounded, friendly typefaces that complement the soft color palette.

---

## Light Theme

| Token | Hex | Role |
|---|---|---|
| `--background` | `#fefdfb` | Page background — warm off-white cream |
| `--surface` | `#fff9f5` | Cards, modals, nav — soft warm white |
| `--surface-hover` | `#f0ebe5` | Hover state on surfaces |
| `--border` | `#e8e0dc` | Default borders |
| `--border-light` | `#f0e8e4` | Subtle dividers inside cards |
| `--text` | `#4a4044` | Primary text — warm dark brown |
| `--text-secondary` | `#7a6e72` | Secondary text — muted mauve |
| `--text-muted` | `#a89ca0` | Hints, labels — light taupe |

### Activity Colors (Light)

Each tracked activity has a **pastel background** and a **darker accent** for text/icons:

| Activity | Accent | Background | Usage |
|---|---|---|---|
| Feeding | `#d4849c` (blush-dark) | `#f8c8dc` (blush) | Pink — nursing, bottles |
| Sleep | `#6a9cb8` (sky-dark) | `#b8d4e8` (sky) | Blue — naps, night sleep |
| Diaper | `#7ab89c` (mint-dark) | `#c8e6d4` (mint) | Green — diaper changes |
| Pumping | `#d4849c` (blush-dark) | `#f8c8dc` (blush) | Pink — breast pump sessions |
| Potty | `#9878b8` (lavender-dark) | `#d8c8e8` (lavender) | Purple — potty training |
| Tummy Time | `#c8a848` (butter-dark) | `#f8e8b8` (butter) | Yellow — tummy time |
| Bath | `#6a9cb8` (sky-dark) | `#b8d4e8` (sky) | Blue — bath time |

### Functional Colors

| Token | Hex | Purpose |
|---|---|---|
| `--success` | `#98d4b4` | Confirmations, active states |
| `--danger` | `#f8a8a8` | Errors, destructive actions |
| `--primary` | `#d4849c` | CTAs, active nav, accent |

---

## Dark Theme

The dark theme uses **warm dark browns** (not cool grays) to maintain the cozy nursery feel.

| Token | Hex | Role |
|---|---|---|
| `--background` | `#1a1614` | Page background — warm near-black |
| `--surface` | `#201c1a` | Cards — dark warm brown |
| `--surface-hover` | `#352f2b` | Hover state |
| `--border` | `#3a3230` | Borders — subtle warm edge |
| `--border-light` | `#2a2420` | Inner dividers |
| `--text` | `#f0e8e4` | Primary text — warm cream |
| `--text-secondary` | `#b8a8a0` | Secondary — muted sand |
| `--text-muted` | `#887870` | Hints — faded taupe |

### Activity Colors (Dark)

In dark mode, activity backgrounds become **muted tints** and accents become **brighter pastels** for contrast:

| Activity | Accent | Background |
|---|---|---|
| Feeding | `#e8a8c0` | `#4a3540` |
| Sleep | `#88b8d8` | `#2d3d4a` |
| Diaper | `#88c8a8` | `#2d4038` |
| Pumping | `#e8a8c0` | `#4a3540` |
| Potty | `#b898d8` | `#3d3548` |
| Tummy Time | `#d8c878` | `#4a4230` |
| Bath | `#88b8d8` | `#2d3d4a` |

---

## Shadows

Soft, warm shadows using `rgba(74, 64, 68, ...)` in light mode and `rgba(0, 0, 0, ...)` in dark mode:

| Token | Light | Dark |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(74,64,68,0.06)` | `0 2px 8px rgba(0,0,0,0.2)` |
| `--shadow-md` | `0 4px 16px rgba(74,64,68,0.08)` | `0 4px 16px rgba(0,0,0,0.25)` |
| `--shadow-lg` | `0 8px 24px rgba(74,64,68,0.1)` | `0 8px 24px rgba(0,0,0,0.3)` |

---

## Border Radius

Generous, rounded corners throughout:

| Token | Value |
|---|---|
| `--radius-sm` | `12px` |
| `--radius-md` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-xl` | `32px` |
| `--radius-full` | `9999px` (pills, circles) |

---

## Responsive Breakpoints

| Breakpoint | Container Max | Widget Grid | Settings Max |
|---|---|---|---|
| Mobile (<480px) | 100% | 2 columns | 100% |
| Tablet (768px+) | 1200px | 3 columns | 600px centered |
| Desktop (1024px+) | 1200px | 4 columns | 640px centered |

---

## Design Principles

1. **Warm, not cold** — brown-based neutrals instead of blue-gray. The dark theme uses `#1a1614` not `#18181b`.
2. **Pastel contrast** — activity colors use soft backgrounds with darker accent text/icons for readability.
3. **Rounded everything** — minimum 12px radius creates a gentle, approachable feel.
4. **Minimal borders** — rely on background color contrast and soft shadows rather than hard lines.
5. **Consistent spacing** — 0.25rem increments from xs to 2xl.
