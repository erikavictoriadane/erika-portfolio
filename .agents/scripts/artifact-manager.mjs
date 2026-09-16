#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const artifactsDir = path.join(projectRoot, 'src/data/artifacts');
const previewsDir = path.join(projectRoot, 'public/previews');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
  if (!match) return { data: {}, body: content, rawYaml: '' };
  const rawYaml = match[1];
  const body = match[2];
  const data = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = null;

  for (const line of lines) {
    const listItemMatch = line.match(/^\s*-\s*(.*)$/);
    if (listItemMatch && currentKey) {
      let itemVal = listItemMatch[1].trim();
      if ((itemVal.startsWith('"') && itemVal.endsWith('"')) || (itemVal.startsWith("'") && itemVal.endsWith("'"))) {
        itemVal = itemVal.slice(1, -1);
      }
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(itemVal);
      continue;
    }

    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      const key = kv[1].trim();
      currentKey = key;
      let val = kv[2].trim();
      if (val === '') {
        data[key] = [];
        continue;
      }
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else if (val === 'true') {
        val = true;
      } else if (val === 'false') {
        val = false;
      } else if (!isNaN(Number(val)) && val !== '') {
        val = Number(val);
      } else if (val.startsWith('[') && val.endsWith(']')) {
        try {
          val = JSON.parse(val);
        } catch {
          val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
        }
      }
      data[key] = val;
    }
  }

  return { data, body, rawYaml };
}

function stringifyFrontmatter(data, body) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string') {
      lines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
    } else if (typeof val === 'boolean' || typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else if (Array.isArray(val)) {
      lines.push(`${key}: ${JSON.stringify(val)}`);
    }
  }
  lines.push('---');
  return `${lines.join('\n')}${body.startsWith('\n') ? '' : '\n'}${body}`;
}

function getAllArtifacts() {
  if (!fs.existsSync(artifactsDir)) return [];
  const files = fs.readdirSync(artifactsDir).filter((f) => f.endsWith('.md'));
  const list = [];

  for (const file of files) {
    const filepath = path.join(artifactsDir, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const { data, body } = parseFrontmatter(content);
    list.push({
      file,
      slug: file.replace(/\.md$/, ''),
      filepath,
      data,
      body,
    });
  }

  // Sort by order ascending, then title
  list.sort((a, b) => {
    const orderA = a.data.order !== undefined ? Number(a.data.order) : Infinity;
    const orderB = b.data.order !== undefined ? Number(b.data.order) : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    const titleA = a.data.title || a.slug;
    const titleB = b.data.title || b.slug;
    return titleA.localeCompare(titleB);
  });

  return list;
}

export function consolidateOrders() {
  const artifacts = getAllArtifacts();
  console.log(`Consolidating ordering across ${artifacts.length} artifacts...`);

  artifacts.forEach((art, index) => {
    const targetOrder = index + 1;
    art.data.order = targetOrder;
    const newContent = stringifyFrontmatter(art.data, art.body);
    fs.writeFileSync(art.filepath, newContent, 'utf-8');
    console.log(`  [${targetOrder}] ${art.slug} -> "${art.data.title || art.slug}"`);
  });

  return artifacts;
}

export function listArtifacts() {
  const artifacts = getAllArtifacts();
  console.log(`\nCurrent Artifacts (${artifacts.length} total):`);
  artifacts.forEach((art, idx) => {
    const typeLabel = art.data.mediaType ? `[${art.data.mediaType.toUpperCase()}] ` : '';
    console.log(
      `  ${art.data.order ?? idx + 1}. ${typeLabel}[${art.slug}] ${art.data.title || 'Untitled'} (tags: ${JSON.stringify(art.data.tags || [])}, metric: ${art.data.metrics || 'none'})`
    );
  });
  return artifacts;
}

export function removeArtifact(slugOrFile) {
  const slug = slugOrFile.replace(/\.md$/, '');
  const filepath = path.join(artifactsDir, `${slug}.md`);

  if (!fs.existsSync(filepath)) {
    console.error(`Error: Artifact "${slug}" does not exist at ${filepath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const { data } = parseFrontmatter(content);

  // Remove preview image and any gallery/inline images referenced in /previews/
  const imagesToDelete = new Set();
  if (data.previewImage && data.previewImage.startsWith('/previews/')) {
    imagesToDelete.add(path.basename(data.previewImage));
  }
  if (Array.isArray(data.galleryImages)) {
    data.galleryImages.forEach((img) => {
      if (typeof img === 'string' && img.startsWith('/previews/')) {
        imagesToDelete.add(path.basename(img));
      }
    });
  }
  const mdImgMatches = content.match(/\/previews\/[a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi) || [];
  mdImgMatches.forEach((match) => {
    imagesToDelete.add(path.basename(match));
  });

  for (const filename of imagesToDelete) {
    const imgPath = path.join(previewsDir, filename);
    if (fs.existsSync(imgPath)) {
      fs.unlinkSync(imgPath);
      console.log(`Deleted associated image: ${imgPath}`);
    }
  }

  // Remove local video file if in /videos/
  const videosDir = path.join(projectRoot, 'public/videos');
  if (data.videoUrl && data.videoUrl.startsWith('/videos/')) {
    const vidFilename = path.basename(data.videoUrl);
    const vidPath = path.join(videosDir, vidFilename);
    if (fs.existsSync(vidPath)) {
      fs.unlinkSync(vidPath);
      console.log(`Deleted associated video file: ${vidPath}`);
    }
  }

  // Remove markdown file
  fs.unlinkSync(filepath);
  console.log(`Deleted artifact markdown: ${filepath}`);

  // Consolidate remaining orders
  consolidateOrders();
}

// CLI handler
const command = process.argv[2];
const arg = process.argv[3];

if (command === 'list') {
  listArtifacts();
} else if (command === 'consolidate') {
  consolidateOrders();
} else if (command === 'remove' && arg) {
  removeArtifact(arg);
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`Usage: node .agents/scripts/artifact-manager.mjs [list|consolidate|remove <slug>]`);
}
