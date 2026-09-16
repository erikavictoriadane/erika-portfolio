# Astro Marketing Portfolio Template

An editorial, high-impact portfolio template built for marketing directors, brand strategists, and growth executives.

Designed with a warm editorial aesthetic (`#faf8f5`), museum-style mat board framing, Cormorant Garamond serif headers, and an interactive Svelte 5 gallery island with real-time filtering, video playback, and lightbox modal examinations.

---

## ✨ Features

- **Astro 5 Content Layer**: Markdown case studies backed by strict Zod schema validation.
- **Svelte 5 Interactive Island**: Real-time multi-tag filtering, keyword search, responsive 1–4 column layouts, and native `<dialog>` lightbox.
- **Multi-Media Artifact Support**:
  - Visual artwork (`image`) with high-resolution viewing.
  - Video showcases (`video`) supporting YouTube, Vimeo, or self-hosted `.mp4` files with automatic 16:9 responsive embeds.
  - Whitepapers & publications (`document`).
- **Inline Case Study Visuals & Collateral**: Supports captioned markdown images in-narrative and a dedicated supporting collateral gallery.
- **Built-in AI Agent Skills**: Includes `.agents/skills/create-artifact` and `.agents/skills/remove-artifact` for automated case study management and contiguous ordering.
- **Template Neutral**: Fully decoupled from any personal names or branding for immediate customization.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

> [!TIP]
> **Server Management:**
> - Press `Ctrl + C` in your terminal to stop the server.
> - If a background process ever lingers on port 4321, stop it with: `npx astro dev stop` (or force-restart with `npm run dev -- --force`).

### 3. Type Check & Validation
```bash
npm run check
```

### 4. Build for Production
```bash
npm run build
```
Generates a static deployment bundle in `dist/`. All dev-only editor controls and API routes are automatically tree-shaken and excluded.

---

## 📂 Managing Case Study Artifacts

### Option 1: In-Browser Artifact Editor (Recommended in Dev)

When running locally (`npm run dev`), a visual editorial suite is accessible directly on the Exhibition Wall:

1. Click the **"Edit Gallery"** button next to the search bar to activate Edit Mode.
2. **`+ Create Artifact`**: Opens the editorial modal to create a new case study. Automatically assigned `order: 1`, shifting downstream artifacts contiguously.
3. **Pencil Icon (Edit)**: Opens any card in the WYSIWYG editor with live media preview, tag chip adder, and dual-tabbed Markdown editor (`Write Markdown` vs `Live Preview`).
4. **Trash Icon (Delete)**: Prompts for confirmation, deletes the markdown file, cleans up unshared media in `public/previews/` and `public/videos/`, and re-consolidates remaining order contiguously (`1, 2, 3...`).
5. **Eye Icon (Visibility)**: Toggle `hidden: true/false` to keep draft case studies unpublished from production builds.
6. **Local Media Auto-Import**:
   - **Pasting Local Paths:** Paste any local file path (e.g. `~/Downloads/hero.jpg` or `~/Downloads/video.mp4`) into the image/video inputs or inline markdown—the backend automatically copies it to `public/previews/` or `public/videos/` on save.
   - **Native File Pickers:** Click **"Choose File"** (cover image), **"Upload Video"** (MP4/WebM), or **"Upload Images"** (collateral) to import directly from your native Finder dialog.

### Option 2: CLI & Terminal Scripts

You can also inspect and manage markdown case studies (`src/data/artifacts/*.md`) directly from your terminal:

```bash
# List all artifacts with their media type and metrics
node .agents/scripts/artifact-manager.mjs list

# Consolidate ordering across all artifacts contiguously (1, 2, 3...)
node .agents/scripts/artifact-manager.mjs consolidate

# Safely remove an artifact and clean up its associated preview/inline images
node .agents/scripts/artifact-manager.mjs remove <slug>
```

## 🚀 Deployment

This static portfolio can be deployed anywhere with zero runtime dependencies. See [**DEPLOY.md**](./DEPLOY.md) for step-by-step guides on:
- **Cloudflare Pages** (Recommended: 100% free, unlimited bandwidth, 1-click custom domain SSL)
- **Vercel** (Zero-config Astro import, preview branches)
- **GitHub Pages** (Built-in automated deployment via included GitHub Actions workflow)
- **Docker & Self-Hosting** (Pre-configured multi-stage `Dockerfile` and `nginx.conf`)

For AI agents and complete architectural specifications, see [**AGENTS.md**](./AGENTS.md).

---

## 📄 License
MIT License. Free to use and customize for personal or commercial portfolios.
