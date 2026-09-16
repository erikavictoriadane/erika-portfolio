---
name: remove-artifact
description: >-
  Removes a portfolio case study artifact. Deletes the markdown file in src/data/artifacts/,
  removes the associated preview image in public/previews/, consolidates ordering of remaining
  artifacts, and verifies the site build.
---

# Remove Artifact Skill

Use this skill when removing a case study or portfolio artifact from the project.

## Workflow Instructions

### Step 1: Identify the Target Artifact
If the user did not specify which artifact to remove:
1. Run the list command:
   ```bash
   node .agents/scripts/artifact-manager.mjs list
   ```
2. Prompt the user to select the artifact by its slug or number.

### Step 2: Delete Artifact & Associated Preview
Execute the removal command:
```bash
node .agents/scripts/artifact-manager.mjs remove <slug>
```
This command automatically:
1. Deletes `src/data/artifacts/<slug>.md`.
2. Finds any referenced preview image, inline images, or gallery collateral images in `public/previews/` and deletes them.
3. Finds any referenced local video in `public/videos/` (if `mediaType === 'video'`) and deletes it.
4. Automatically re-numbers and consolidates all remaining artifacts contiguously (`1, 2, 3...`).

### Step 3: Verify the Build
Run:
```bash
npm run check && npm run build
```
Verify that zero errors or broken references remain.

### Step 4: Report to the User
Display the remaining artifacts and notify the user that the site is ready to view via `npm run dev` at `http://localhost:4321`.
