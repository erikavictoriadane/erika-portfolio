# AGENTS.md

Welcome to the **Astro Marketing Portfolio Template** repository. This document serves as the primary technical specification, architectural reference, and operational playbook for AI agents (and human engineers) maintaining, customizing, or extending this project.

---

## 1. Project Overview & Architectural Vision

This repository is a production-grade, editorial-aesthetic portfolio template designed specifically for senior marketing leaders, brand strategists, and growth executives. It balances deep qualitative case study narratives with quantitative commercial impact metrics.

### Key Architectural Tenets
- **Zero-JS by Default, Islands Where Interactive**: Built with **Astro 5** static site generation. Dynamic interactive experiences (filtering, real-time search, lightbox modals, embedded video playback, responsive column layouts) are encapsulated in a single client-hydrated **Svelte 5** island (`WorkGallery.svelte`).
- **Astro Content Layer**: All portfolio artifacts (case studies) are strictly validated via Zod schemas in `src/content.config.ts` and loaded from markdown files in `src/data/artifacts/`.
- **Template Neutrality**: All copy, titles, and placeholders avoid hardcoded personal names, allowing any user to easily fork, customize, or deploy.
- **Rich Editorial Aesthetics**: Warm limestone/paper palette (`#faf8f5`, stone borders, soft shadows), museum-grade mat board portrait framing, Cormorant Garamond serif headers, and Plus Jakarta Sans geometric body copy.

---

## 2. Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | [Astro 5](https://astro.build/) | Static Site Generation (SSG) with Content Layer (`glob` loader) |
| **Interactive Island** | [Svelte 5](https://svelte.dev/) | Uses Svelte 5 Runes (`$state`, `$derived`, `$props`) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | `@tailwindcss/vite` plugin with custom typography tokens |
| **Type Checking** | [TypeScript](https://www.typescriptlang.org/) + `astro check` | Strict typing across schema and component props |
| **Icons & Media** | Inline SVG & HTML5 / iframe | Responsive YouTube/Vimeo embed support and HTML5 video |

---

## 3. Project Directory Map

```text
astro_portfolio/
├── .agents/
│   ├── scripts/
│   │   └── artifact-manager.mjs   # Node utility for listing, removing, and consolidating artifact ordering
│   └── skills/
│       ├── create-artifact/
│       │   └── SKILL.md           # Antigravity skill for adding case studies (image, video, doc)
│       └── remove-artifact/
│           └── SKILL.md           # Antigravity skill for removing case studies and cleaning up media
├── public/
│   ├── favicon.svg                # Monogram luxury icon
│   ├── images/
│   │   ├── portrait.jpg           # About Me section portrait (museum mat board frame)
│   │   └── portrait-hero.jpg      # Hero section companion portrait
│   ├── previews/                  # Cover images, video posters, and supporting collateral
│   └── videos/                    # Optional local self-hosted MP4/WebM files
├── src/
│   ├── components/
│   │   └── WorkGallery.svelte     # Svelte 5 island: gallery wall, filter bar, modal lightbox, video player
│   ├── data/
│   │   └── artifacts/             # Markdown case studies (1 file per project)
│   ├── layouts/
│   │   └── Layout.astro           # Base HTML layout, Google Fonts preconnect, metadata & SEO
│   ├── pages/
│   │   └── index.astro            # Home page (Hero, About Me, Gallery Island, Philosophy, Footer)
│   ├── styles/
│   │   └── global.css             # Tailwind v4 theme, font variables, and utility classes
│   ├── content.config.ts          # Zod schema definition for artifacts collection
│   └── env.d.ts                   # Astro client types reference
├── astro.config.mjs               # Astro config (Tailwind & Svelte integrations)
├── svelte.config.js               # Svelte compiler configuration with vitePreprocess
├── tsconfig.json                  # TypeScript compiler options
└── package.json                   # Scripts and project dependencies
```

---

## 4. Artifact Content Schema & Multi-Media System

All portfolio artifacts reside in `src/data/artifacts/<slug>.md`.

### Frontmatter Specification (`src/content.config.ts`)

```typescript
{
  title: z.string(),                                            // Required: Formal case study title
  description: z.string(),                                      // Required: 1-2 sentence executive summary
  tags: z.array(z.string()),                                    // Required: Discipline tags (e.g. ["Campaigns", "Brand Strategy"])
  previewImage: z.string().optional(),                          // Recommended: Thumbnail cover & video poster (in /previews/)
  metrics: z.string().optional(),                               // Optional: Key KPI badge (e.g. "+240% Sales Target")
  order: z.number().optional(),                                 // Optional: Sorting order (1, 2, 3...). Consolidated by helper
  mediaType: z.enum(['image', 'video', 'document']).default('image'), // Media classification
  videoUrl: z.string().optional(),                              // Optional: YouTube/Vimeo link or local /videos/ path
  galleryImages: z.array(z.string()).default([]),               // Optional: Supporting visual collateral array
  link: z.string().url().optional(),                            // Optional: External live campaign link
  showLiveLink: z.boolean().default(false),                     // Toggle: Display "View Live Project" button (default: false)
  date: z.union([z.string(), z.date()]).optional(),             // Optional: Archive date string
  showDate: z.boolean().default(false),                         // Toggle: Display archive date in modal footer (default: false)
  featured: z.boolean().default(false),                         // Flag for highlighted work
}
```

### Media Types & Modal Lightbox Behavior
1. **`mediaType: "image"`**:
   - Gallery wall displays `previewImage`.
   - Lightbox modal displays high-resolution visual artwork with smooth zoom framing.
2. **`mediaType: "video"`**:
   - Gallery wall displays `previewImage` with a discrete `▶ VIDEO` badge and a centered play button overlay.
   - Lightbox modal dynamically embeds a 16:9 responsive player:
     - **YouTube**: Privacy-friendly `youtube-nocookie.com/embed/<id>` with full controls.
     - **Vimeo**: Embedded `player.vimeo.com/video/<id>`.
     - **Direct / Local Video**: HTML5 `<video controls playsinline poster="...">` player using files in `public/videos/`.
     - Stopping playback occurs immediately upon closing the dialog.
3. **Inline Markdown Images**:
   - Case study narrative bodies support markdown images `![Caption](/previews/image.jpg)`.
   - Rendered as editorial `<figure>` elements with subtle stone borders and mono-font `<figcaption>` bars.
4. **Collateral Grid (`galleryImages`)**:
   - If provided in frontmatter, renders a 2-column visual exhibition beneath the narrative.
   - Clicking any collateral item swaps it into the top hero preview frame, with a *"Return to Cover"* or *"Return to Video"* button.

---

## 5. Antigravity Skills for Agents

The repository includes pre-configured project skills located in `.agents/skills/`:

### 1. `create-artifact` (`.agents/skills/create-artifact/SKILL.md`)
Guides agents through creating a complete, production-ready artifact:
- Prompts for missing metadata (title, summary, tags, metric, order, media type).
- Supports YouTube/Vimeo URLs or local video files (copied to `public/videos/`).
- Copies preview thumbnails and supporting collateral to `public/previews/`.
- Runs order consolidation and verifies the production build (`npm run check && npm run build`).

### 2. `remove-artifact` (`.agents/skills/remove-artifact/SKILL.md`)
Guides agents through safely deleting an artifact:
- Deletes `src/data/artifacts/<slug>.md`.
- Automatically cleans up the primary preview image, local video file (if applicable), and all inline/gallery images referenced in `public/previews/`.
- Re-consolidates remaining artifact sort ordering contiguously (`1, 2, 3...`).
- Verifies zero broken links remain.

### 3. Utility Script: `artifact-manager.mjs`
Run directly from terminal:
```bash
# List all current artifacts with their type, tags, and metrics
node .agents/scripts/artifact-manager.mjs list

# Re-number all artifacts contiguously (1, 2, 3...)
node .agents/scripts/artifact-manager.mjs consolidate

# Safely delete an artifact and all associated media
node .agents/scripts/artifact-manager.mjs remove <slug>
```

---

## 6. Development & Verification Workflows

### Setup & Installation
```bash
npm install
```

### Running the Local Dev Server
```bash
npm run dev
```
Serves the site locally at `http://localhost:4321`. Hot module replacement (HMR) applies instantly across Astro and Svelte files.

### In-Browser Dev Artifact Editor
When running in dev mode (`npm run dev`):
- A Connect REST middleware (`src/dev/artifactDevMiddleware.mjs`) is mounted automatically inside Vite at `/api/artifact` (with aliases `/api/edit_mode`, `/api/update`, `/api/remove`).
- An **"Edit Gallery"** toggle button appears next to the search bar on the Exhibition Wall.
- Clicking it enables **Edit Mode**, providing:
  - **`+ Create Artifact`**: Opens the WYSIWYG editorial modal to create a new markdown case study (assigned `order: 1` by default with automatic order shifting).
  - **Pencil Icon (Edit)** on each card: Opens the editor pre-loaded with the case study's frontmatter, media, and markdown body. Supports live markdown preview.
  - **Trash Icon (Delete)** on each card: Prompts for confirmation, deletes the markdown file, cleans up unshared media in `/previews/` and `/videos/`, and re-indexes remaining artifact orders contiguously.
  - **Eye Icon (Visibility)** on each card: Toggles `hidden: true/false` (draft state) without publishing to production builds.
- **Production Isolation**: Vite completely tree-shakes and strips all editor controls and middleware during `npm run build`, ensuring zero editor UI or API routes in static production deployments (GitHub Pages).

### Type-Checking & Lint Diagnostics
```bash
npm run check
```
Runs `astro check` across all `.astro`, `.ts`, and markdown content collections.

### Production Static Build
```bash
npm run build
```
Compiles static HTML and optimized client assets into `dist/`. Always run this before pushing changes or opening pull requests.

### Deployment Operations
Complete deployment workflows (Cloudflare Pages, Vercel, GitHub Pages, Docker container) and custom domain configurations are documented in [`DEPLOY.md`](./DEPLOY.md).

---

## 7. Design System & Coding Conventions

When modifying styles or adding new sections, maintain consistency with the existing design system:

- **Color Palette**:
  - Background: Warm linen cream (`#faf8f5`)
  - Panels/Cards: Pure white (`#ffffff`) or light stone (`#f5f4f0`)
  - Text: High-contrast stone (`text-stone-900`, `text-stone-700`, `text-stone-500`)
  - Accents: Deep charcoal (`bg-stone-900`) and subtle amber accents (`bg-amber-600`)
- **Typography**:
  - Headings: `font-serif` (Cormorant Garamond)
  - Body & UI: `font-sans` (Plus Jakarta Sans)
  - Badges & Metrics: `font-mono` (JetBrains Mono / system monospace)
- **Component Framing**:
  - Museum mat board style: white border padding (`p-2.5 bg-white shadow-xl ring-1 ring-stone-900/5 rounded-2xl`).
  - Subtle micro-interactions: card elevation (`hover:-translate-y-1 hover:shadow-xl`), image zooms (`group-hover:scale-105`), smooth transitions (`duration-300`).
- **Accessibility**:
  - Every interactive element must have clear focus rings (`focus:ring-2 focus:ring-stone-400`).
  - All clickable cards and modal triggers must have descriptive `aria-label`s.
  - Dialog elements must handle keyboard navigation (`Esc` to dismiss) and restore background scroll lock cleanly.
