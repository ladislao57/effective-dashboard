# Minimal Zen Dashboard (Obsidian Plugin)

Minimal Zen Dashboard is a **focus-first**, **nature-inspired** homepage view for Obsidian. It gives you:

- A calm top bar with quick actions.
- A forest banner.
- A central **Focus Today** card.
- Expandable PARA-style cards powered by **index note links**.
- Right sidebar widgets (calendar, habits tracker, mini graph).

## Features

- Custom dashboard view (`Minimal Zen Dashboard`).
- Keyboard-friendly expandable cards.
- Link parsing from index notes (`[[WikiLinks]]` only).
- Habit tracking from daily note frontmatter values.
- Soft animations and rounded, readable UI.
- Configurable colors, font, banner, and widget toggles.

## Dashboard Data Model

### Index-based section links (important)

Each card reads links from its configured index note only.

Example in `areas.md`:

```md
[[Health]]
[[Fitness]]
[[Finance]]
[[Learning]]
```

The `Areas` card will render exactly those links.
It **does not** scan folders and does not list all files.

### Habits tracker frontmatter fields

The plugin reads up to 7 recent daily notes (default: `Daily/`) and tracks:

- `warmup`
- `yoga`
- `meditation`
- `training`
- `english`
- `study`
- `energy`
- `mood`
- `clarity`
- `day_score`
- `sleep_quality`

Accepted values include numbers (`0-10`), booleans, and yes/no strings.

## Installation Guide

1. Install **Node.js** (LTS recommended).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build plugin:
   ```bash
   npm run build
   ```
4. Copy this plugin folder into your vault:
   ```
   <vault>/.obsidian/plugins/minimal-zen-dashboard/
   ```
5. Enable **Minimal Zen Dashboard** in Obsidian settings → Community plugins.

## Usage

- Open command palette and run: **Open Minimal Zen Dashboard**.
- Use top bar buttons for quick note creation.
- Press `Enter` on any card header to expand/collapse it.

## Customization Guide

### 1) Change colors

Go to plugin settings and adjust:

- Primary color
- Secondary color
- Accent color
- Surface color

Defaults:

- Primary: `#2f5d3a`
- Secondary: `#1e2f25`
- Accent: `#3c7a53`
- Surface: `#e8efe9`

### 2) Change banner image

Set **Banner image URL** in plugin settings.

### 3) Change fonts

Set **Font family** (default: `"Noto Sans", sans-serif`).

### 4) Add new sections

In plugin settings, update the **index note mapping**.
For each section card, point it to a markdown file that contains `[[links]]`.

### 5) Enable or disable widgets

Toggle calendar, habits, and mini graph widgets independently in settings.


## Architecture Notes

- `dashboard.ts` is focused on UI rendering and interactions.
- `dashboard-data.ts` is a small data layer with cache invalidation by file mtime.
- `utils.ts` contains shared pure helpers for parsing links, dates, habits, and file-path handling.

This separation improves maintainability and prevents repeated index-note parsing during frequent re-renders.

## Build Tooling

This repository includes a standard Obsidian plugin build setup:

- `package.json`
- `tsconfig.json`
- `esbuild.config.mjs`
- `versions.json`

Run:

```bash
npm install
npm run build
```

This outputs `main.js` for loading by Obsidian.

## Development

Required files:

- `manifest.json`
- `main.ts`
- `dashboard.ts`
- `dashboard-data.ts`
- `settings.ts`
- `utils.ts`
- `styles.css`
- `README.md`

## License

MIT
