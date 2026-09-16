---
name: create-artifact
description: >-
  Creates a new portfolio case study artifact supporting multiple media types (image, video, document).
  Prompts for required metadata (title, description, tags, mediaType, preview image, video URL, metrics, ordering),
  handles media placement, consolidates artifact sort ordering, and verifies the site build.
---

# Create Artifact Skill

Use this skill when adding a new case study or portfolio artifact (image, video, or document) to the project.

## Workflow Instructions

### Step 1: Gather Required Information
Inspect the user request. If any required information is missing, prompt the user for:
1. **Slug / Filename**: URL-friendly kebab-case name (e.g., `summer-brand-anthem`).
2. **Title**: Formal case study or campaign title.
3. **Description**: 1–2 sentence executive summary for the placard.
4. **Media Type**:
   - `image` (default): Standard visual campaign art board.
   - `video`: Embeds a responsive video player in the modal (YouTube, Vimeo, or local MP4/WebM).
   - `document`: Whitepaper, benchmark report, or editorial publication.
5. **Video URL** *(Required if mediaType is video)*:
   - YouTube URL (e.g. `https://www.youtube.com/watch?v=...` or `https://youtu.be/...`)
   - Vimeo URL (e.g. `https://vimeo.com/...`)
   - Local MP4 / WebM file path (copied to `public/videos/<slug>.<ext>`)
6. **Preview / Poster Image**: Image file on disk or URL used for the card thumbnail and video poster.
7. **Discipline Tags**: 2–4 marketing categories (e.g., `["Campaigns", "Brand Strategy", "Experiential"]`).
8. **Key Commercial Metric**: High-impact badge (e.g., `+240% Sales Target`, `2.5M Views`, `$8.2M Pipeline`).
9. **Display Priority / Order**: Desired position (e.g. `1` for top placement, or default to append).
10. **Optional Link**: External project URL (defaults to disabled `showLiveLink: false`).
11. **Optional Date**: Date string (defaults to disabled `showDate: false`).
12. **Inline / Supporting Visuals** *(Optional)*:
    - In-body markdown images (e.g. `![Caption](/previews/<filename>)`) to embed within the case study narrative.
    - Frontmatter `galleryImages` array for supporting collateral cards displayed in the modal alongside the description.
13. **Case Study Body**: High-level background, execution strategy, and measurable outcomes (can embed inline images).

### Step 2: Handle Media Assets
1. **Preview Image**:
   - Copy source image to `public/previews/<slug>.<ext>`.
   - Set `previewImage: "/previews/<slug>.<ext>"` in the frontmatter.
   - If no image is provided, generate an editorial art preview using `generate_image`.
2. **Inline & Supporting Images**:
   - Copy any supporting collateral or inline images to `public/previews/<slug>-<name>.<ext>`.
   - Include them in `galleryImages: ["/previews/<slug>-<name>.<ext>"]` or embed directly into markdown: `![Caption](/previews/<slug>-<name>.<ext>)`.
3. **Video Asset** *(if mediaType is video and local file is provided)*:
   - Create `public/videos/` if needed.
   - Copy the local video file to `public/videos/<slug>.<ext>`.
   - Set `videoUrl: "/videos/<slug>.<ext>"` in the frontmatter.
   - For YouTube or Vimeo, set `videoUrl: "https://www.youtube.com/watch?v=..."` directly.

### Step 3: Write the Artifact Markdown File
Create `src/data/artifacts/<slug>.md`:

```markdown
---
title: "Your Title Here"
description: "1-2 sentence executive summary."
tags: ["Campaigns", "Brand Strategy"]
mediaType: "image" # "image" | "video" | "document"
previewImage: "/previews/<slug>.jpg"
metrics: "+240% First-Month Sales Target"
order: 1
featured: false
showLiveLink: false
showDate: false
galleryImages:
  - "/previews/<slug>-collateral-1.jpg"
  - "/previews/<slug>-collateral-2.jpg"
---

### Background & Strategic Objectives
Describe the market opportunity, customer problem, and strategic goals.

### Marketing Strategy & Execution
Detail the campaign pillars, channel mix, creative direction, and implementation.

![Visual asset or packaging prototype caption](/previews/<slug>-collateral-1.jpg)

### Key Results & Commercial Impact
Highlight measurable KPI metrics, revenue impact, and industry accolades.
```

### Step 4: Consolidate Artifact Ordering
Run the consolidation helper:
```bash
node .agents/scripts/artifact-manager.mjs consolidate
```
This ensures all artifacts in `src/data/artifacts/` maintain contiguous 1-based ordering (`1, 2, 3...`) with no gaps.

### Step 5: Build & Verification
1. Run `npm run check` and `npm run build` to ensure the collection passes validation:
   ```bash
   npm run check && npm run build
   ```
2. Report completion to the user and remind them they can view the live site via `npm run dev` at `http://localhost:4321`.
