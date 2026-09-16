import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');
const artifactsDir = path.join(projectRoot, 'src/data/artifacts');
const previewsDir = path.join(projectRoot, 'public/previews');
const videosDir = path.join(projectRoot, 'public/videos');

export function parseFrontmatter(content) {
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

export function stringifyFrontmatter(data, body = '') {
  const lines = ['---'];
  const fieldOrder = [
    'title',
    'description',
    'tags',
    'link',
    'showLiveLink',
    'date',
    'showDate',
    'featured',
    'hidden',
    'previewImage',
    'metrics',
    'mediaType',
    'videoUrl',
    'order',
    'galleryImages'
  ];

  const processedKeys = new Set();

  for (const key of fieldOrder) {
    if (key in data) {
      processedKeys.add(key);
      const val = data[key];
      if (val === undefined || val === null || val === '') continue;
      if (typeof val === 'string') {
        lines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
      } else if (typeof val === 'boolean' || typeof val === 'number') {
        lines.push(`${key}: ${val}`);
      } else if (Array.isArray(val)) {
        lines.push(`${key}: ${JSON.stringify(val)}`);
      }
    }
  }

  // Any other keys
  for (const [key, val] of Object.entries(data)) {
    if (processedKeys.has(key)) continue;
    if (val === undefined || val === null || val === '') continue;
    if (typeof val === 'string') {
      lines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
    } else if (typeof val === 'boolean' || typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else if (Array.isArray(val)) {
      lines.push(`${key}: ${JSON.stringify(val)}`);
    }
  }

  lines.push('---');
  const cleanBody = body ? (body.startsWith('\n') ? body : `\n${body}`) : '\n';
  return `${lines.join('\n')}${cleanBody}`;
}

export function resolveAndCopyMedia(mediaPath, targetType = 'image') {
  if (!mediaPath || typeof mediaPath !== 'string') return mediaPath || '';
  const trimmed = mediaPath.trim().replace(/^['"]|['"]$/g, '');
  if (!trimmed) return '';

  // If already an external web URL, keep as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const targetDir = targetType === 'video' ? videosDir : previewsDir;
  const webPrefix = targetType === 'video' ? '/videos' : '/previews';

  // Expand ~ to user home
  let localCandidate = trimmed;
  if (localCandidate.startsWith('~')) {
    localCandidate = path.join(os.homedir(), localCandidate.slice(1));
  } else if (localCandidate.startsWith('file://')) {
    try {
      localCandidate = fileURLToPath(localCandidate);
    } catch {
      // ignore
    }
  }

  // Check if candidate exists on local filesystem
  const resolvedPath = path.resolve(localCandidate);
  if (fs.existsSync(resolvedPath)) {
    try {
      const stat = fs.statSync(resolvedPath);
      if (stat.isFile()) {
        fs.mkdirSync(targetDir, { recursive: true });
        const rawExt = path.extname(resolvedPath);
        const rawBase = path.basename(resolvedPath, rawExt);
        const safeBase = rawBase.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        const filename = `${safeBase || 'media'}${rawExt.toLowerCase()}`;
        const destPath = path.join(targetDir, filename);

        // Copy file if source and target are different
        if (resolvedPath !== path.resolve(destPath)) {
          fs.copyFileSync(resolvedPath, destPath);
          console.log(`[ArtifactDevAPI] Copied local media from ${resolvedPath} -> ${destPath}`);
        }
        return `${webPrefix}/${filename}`;
      }
    } catch (e) {
      console.warn(`[ArtifactDevAPI] Error copying media from ${resolvedPath}:`, e);
    }
  }

  return trimmed;
}

export function processMarkdownImages(body) {
  if (!body) return body || '';
  return body.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
    const newSrc = resolveAndCopyMedia(src, 'image');
    return `![${alt}](${newSrc})`;
  });
}

export function getAllArtifacts() {
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
      id: file.replace(/\.md$/, ''),
      filepath,
      data,
      body: body.trim(),
    });
  }

  list.sort((a, b) => {
    const orderA = a.data.order !== undefined && a.data.order !== null ? Number(a.data.order) : Infinity;
    const orderB = b.data.order !== undefined && b.data.order !== null ? Number(b.data.order) : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    const titleA = a.data.title || a.slug;
    const titleB = b.data.title || b.slug;
    return titleA.localeCompare(titleB);
  });

  return list;
}

export function consolidateOrders() {
  const artifacts = getAllArtifacts();
  artifacts.forEach((art, index) => {
    const targetOrder = index + 1;
    art.data.order = targetOrder;
    const newContent = stringifyFrontmatter(art.data, art.body);
    fs.writeFileSync(art.filepath, newContent, 'utf-8');
  });
  return artifacts;
}

export function generateSlug(title) {
  let baseSlug = (title || 'untitled')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  if (!baseSlug) baseSlug = 'artifact';

  let slug = baseSlug;
  let counter = 1;
  while (fs.existsSync(path.join(artifactsDir, `${slug}.md`))) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
}

export function removeArtifactFiles(slug) {
  const cleanSlug = slug.replace(/\.md$/, '');
  const filepath = path.join(artifactsDir, `${cleanSlug}.md`);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Artifact "${cleanSlug}" does not exist at ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const { data } = parseFrontmatter(content);

  // Check if any other artifacts reference the same images before deleting
  const otherArtifacts = getAllArtifacts().filter((a) => a.slug !== cleanSlug);
  const otherImages = new Set();
  const otherVideos = new Set();

  for (const art of otherArtifacts) {
    if (art.data.previewImage) otherImages.add(path.basename(art.data.previewImage));
    if (Array.isArray(art.data.galleryImages)) {
      art.data.galleryImages.forEach((img) => otherImages.add(path.basename(img)));
    }
    const mdMatches = art.body.match(/\/previews\/[a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi) || [];
    mdMatches.forEach((m) => otherImages.add(path.basename(m)));

    if (art.data.videoUrl && art.data.videoUrl.startsWith('/videos/')) {
      otherVideos.add(path.basename(art.data.videoUrl));
    }
  }

  // Identify images belonging to this artifact
  const imagesToDelete = new Set();
  if (data.previewImage && data.previewImage.startsWith('/previews/')) {
    const filename = path.basename(data.previewImage);
    if (!otherImages.has(filename)) imagesToDelete.add(filename);
  }
  if (Array.isArray(data.galleryImages)) {
    data.galleryImages.forEach((img) => {
      if (typeof img === 'string' && img.startsWith('/previews/')) {
        const filename = path.basename(img);
        if (!otherImages.has(filename)) imagesToDelete.add(filename);
      }
    });
  }
  const mdImgMatches = content.match(/\/previews\/[a-zA-Z0-9_\-\.]+\.(?:jpg|jpeg|png|webp|avif|gif|svg)/gi) || [];
  mdImgMatches.forEach((match) => {
    const filename = path.basename(match);
    if (!otherImages.has(filename)) imagesToDelete.add(filename);
  });

  for (const filename of imagesToDelete) {
    const imgPath = path.join(previewsDir, filename);
    if (fs.existsSync(imgPath)) {
      fs.unlinkSync(imgPath);
    }
  }

  // Check and delete local video if not shared
  if (data.videoUrl && data.videoUrl.startsWith('/videos/')) {
    const vidFilename = path.basename(data.videoUrl);
    if (!otherVideos.has(vidFilename)) {
      const vidPath = path.join(videosDir, vidFilename);
      if (fs.existsSync(vidPath)) {
        fs.unlinkSync(vidPath);
      }
    }
  }

  // Delete markdown file
  fs.unlinkSync(filepath);

  // Consolidate remaining orders
  consolidateOrders();
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

export async function artifactDevMiddleware(req, res, next) {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname.replace(/\/$/, '');
  const method = req.method ? req.method.toUpperCase() : 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  // Only handle relevant API paths
  const isApi =
    pathname === '/api/artifact' ||
    pathname === '/api/artifact/health' ||
    pathname === '/api/edit_mode' ||
    pathname === '/api/create' ||
    pathname === '/api/update' ||
    pathname === '/api/remove' ||
    pathname === '/api/upload';

  if (!isApi) {
    return next();
  }

  try {
    // 1. Health Check
    if (pathname === '/api/artifact/health' || pathname === '/api/edit_mode') {
      return sendJson(res, 200, {
        status: 'ok',
        editMode: true,
        message: 'Dev artifact API is active'
      });
    }

    // 2. Direct Media Upload / Local Path Resolver
    if (pathname === '/api/upload' && method === 'POST') {
      const payload = await parseJsonBody(req);
      const mediaType = payload.type === 'video' ? 'video' : 'image';
      const targetDir = mediaType === 'video' ? videosDir : previewsDir;
      const webPrefix = mediaType === 'video' ? '/videos' : '/previews';

      // Option A: Resolve existing local file path (e.g. ~/Downloads/pic.jpg)
      if (payload.filePath) {
        const resolvedUrl = resolveAndCopyMedia(payload.filePath, mediaType);
        return sendJson(res, 200, { success: true, url: resolvedUrl });
      }

      // Option B: Base64 data from file input
      if (payload.data && payload.filename) {
        fs.mkdirSync(targetDir, { recursive: true });
        const rawExt = path.extname(payload.filename);
        const rawBase = path.basename(payload.filename, rawExt);
        const safeBase = rawBase.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
        const filename = `${safeBase || 'upload'}${rawExt.toLowerCase()}`;
        const destPath = path.join(targetDir, filename);

        let base64Data = payload.data;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(destPath, buffer);
        console.log(`[ArtifactDevAPI] Saved uploaded media to ${destPath}`);

        return sendJson(res, 200, {
          success: true,
          url: `${webPrefix}/${filename}`,
          filename
        });
      }

      return sendJson(res, 400, { error: 'Upload requires either filePath or { filename, data }' });
    }

    // 3. GET Artifacts
    if (pathname === '/api/artifact' && method === 'GET') {
      const slug = urlObj.searchParams.get('slug');
      const artifacts = getAllArtifacts();
      if (slug) {
        const item = artifacts.find((a) => a.slug === slug);
        if (!item) return sendJson(res, 404, { error: `Artifact "${slug}" not found` });
        return sendJson(res, 200, item);
      }
      return sendJson(res, 200, { artifacts });
    }

    // 4. POST Artifact (Create)
    if ((pathname === '/api/artifact' && method === 'POST') || (pathname === '/api/create' && (method === 'POST' || method === 'PUT'))) {
      const payload = await parseJsonBody(req);
      const title = payload.title?.trim();
      const description = payload.description?.trim();

      if (!title || !description) {
        return sendJson(res, 400, { error: 'Both title and description are required' });
      }

      const slug = payload.slug?.trim() || generateSlug(title);
      const filepath = path.join(artifactsDir, `${slug}.md`);

      if (fs.existsSync(filepath)) {
        return sendJson(res, 400, { error: `Artifact with slug "${slug}" already exists` });
      }

      // Desired order (default to 1 for new artifacts)
      const targetOrder = payload.order ? Number(payload.order) : 1;

      // Shift existing artifacts with order >= targetOrder
      const existing = getAllArtifacts();
      existing.forEach((art) => {
        const curOrder = Number(art.data.order) || 1;
        if (curOrder >= targetOrder) {
          art.data.order = curOrder + 1;
          fs.writeFileSync(art.filepath, stringifyFrontmatter(art.data, art.body), 'utf-8');
        }
      });

      // Automatically copy and rewrite any local media paths
      const previewImage = resolveAndCopyMedia(payload.previewImage, 'image');
      const galleryImages = Array.isArray(payload.galleryImages)
        ? payload.galleryImages.map((img) => resolveAndCopyMedia(img, 'image'))
        : [];
      const videoUrl = resolveAndCopyMedia(payload.videoUrl, 'video');
      const cleanBody = processMarkdownImages(payload.body || '');

      const frontmatterData = {
        title,
        description,
        tags: Array.isArray(payload.tags) ? payload.tags : (payload.tags ? [payload.tags] : ['General']),
        link: payload.link || '',
        showLiveLink: Boolean(payload.showLiveLink),
        date: payload.date || new Date().toISOString().split('T')[0],
        showDate: Boolean(payload.showDate),
        featured: Boolean(payload.featured),
        hidden: Boolean(payload.hidden),
        previewImage,
        metrics: payload.metrics || '',
        mediaType: ['image', 'video', 'document'].includes(payload.mediaType) ? payload.mediaType : 'image',
        videoUrl,
        order: targetOrder,
        galleryImages
      };

      const rawContent = stringifyFrontmatter(frontmatterData, cleanBody);
      fs.writeFileSync(filepath, rawContent, 'utf-8');

      // Re-consolidate contiguous orders
      consolidateOrders();

      const created = {
        slug,
        id: slug,
        filepath,
        data: frontmatterData,
        body: cleanBody
      };

      return sendJson(res, 201, {
        success: true,
        message: `Artifact "${title}" created successfully`,
        artifact: created
      });
    }

    // 5. PUT Artifact (Update)
    if ((pathname === '/api/artifact' && method === 'PUT') || (pathname === '/api/update' && (method === 'POST' || method === 'PUT'))) {
      const payload = await parseJsonBody(req);
      const slug = payload.slug || payload.id || urlObj.searchParams.get('slug');

      if (!slug) {
        return sendJson(res, 400, { error: 'Artifact slug or ID is required for update' });
      }

      const cleanSlug = slug.replace(/\.md$/, '');
      const filepath = path.join(artifactsDir, `${cleanSlug}.md`);

      if (!fs.existsSync(filepath)) {
        return sendJson(res, 404, { error: `Artifact "${cleanSlug}" does not exist` });
      }

      const existingContent = fs.readFileSync(filepath, 'utf-8');
      const { data: currentData, body: currentBody } = parseFrontmatter(existingContent);

      const targetOrder = payload.order !== undefined && payload.order !== null && !isNaN(Number(payload.order))
        ? Number(payload.order)
        : (currentData.order || 1);

      const currentOrder = Number(currentData.order) || 1;

      // Handle re-ordering if order changed
      if (targetOrder !== currentOrder) {
        const all = getAllArtifacts();
        for (const art of all) {
          if (art.slug === cleanSlug) continue;
          const o = Number(art.data.order) || 1;
          if (targetOrder < currentOrder) {
            // Moving up (e.g. 4 -> 2): shift items in [targetOrder, currentOrder - 1] down (+1)
            if (o >= targetOrder && o < currentOrder) {
              art.data.order = o + 1;
              fs.writeFileSync(art.filepath, stringifyFrontmatter(art.data, art.body), 'utf-8');
            }
          } else {
            // Moving down (e.g. 2 -> 4): shift items in [currentOrder + 1, targetOrder] up (-1)
            if (o > currentOrder && o <= targetOrder) {
              art.data.order = o - 1;
              fs.writeFileSync(art.filepath, stringifyFrontmatter(art.data, art.body), 'utf-8');
            }
          }
        }
      }

      // Automatically copy and rewrite any local media paths
      const previewImage = payload.previewImage !== undefined
        ? resolveAndCopyMedia(payload.previewImage, 'image')
        : currentData.previewImage;

      const galleryImages = payload.galleryImages !== undefined
        ? (Array.isArray(payload.galleryImages) ? payload.galleryImages.map((img) => resolveAndCopyMedia(img, 'image')) : [])
        : currentData.galleryImages;

      const videoUrl = payload.videoUrl !== undefined
        ? resolveAndCopyMedia(payload.videoUrl, 'video')
        : currentData.videoUrl;

      const updatedBody = payload.body !== undefined
        ? processMarkdownImages(payload.body)
        : currentBody;

      const updatedData = {
        ...currentData,
        title: payload.title !== undefined ? payload.title.trim() : currentData.title,
        description: payload.description !== undefined ? payload.description.trim() : currentData.description,
        tags: payload.tags !== undefined ? (Array.isArray(payload.tags) ? payload.tags : [payload.tags]) : currentData.tags,
        link: payload.link !== undefined ? payload.link : currentData.link,
        showLiveLink: payload.showLiveLink !== undefined ? Boolean(payload.showLiveLink) : currentData.showLiveLink,
        date: payload.date !== undefined ? payload.date : currentData.date,
        showDate: payload.showDate !== undefined ? Boolean(payload.showDate) : currentData.showDate,
        featured: payload.featured !== undefined ? Boolean(payload.featured) : currentData.featured,
        hidden: payload.hidden !== undefined ? Boolean(payload.hidden) : currentData.hidden,
        previewImage,
        metrics: payload.metrics !== undefined ? payload.metrics : currentData.metrics,
        mediaType: payload.mediaType !== undefined ? payload.mediaType : currentData.mediaType,
        videoUrl,
        order: targetOrder,
        galleryImages
      };

      const rawContent = stringifyFrontmatter(updatedData, updatedBody);
      fs.writeFileSync(filepath, rawContent, 'utf-8');

      // Re-consolidate orders to guarantee contiguity
      consolidateOrders();

      return sendJson(res, 200, {
        success: true,
        message: `Artifact "${updatedData.title}" updated successfully`,
        artifact: {
          slug: cleanSlug,
          id: cleanSlug,
          data: updatedData,
          body: updatedBody
        }
      });
    }

    // 6. DELETE Artifact (Remove)
    if (
      (pathname === '/api/artifact' && method === 'DELETE') ||
      (pathname === '/api/remove' && (method === 'DELETE' || method === 'POST'))
    ) {
      let slug = urlObj.searchParams.get('slug');
      if (!slug) {
        const payload = await parseJsonBody(req);
        slug = payload.slug || payload.id;
      }

      if (!slug) {
        return sendJson(res, 400, { error: 'Slug parameter is required to remove an artifact' });
      }

      removeArtifactFiles(slug);

      return sendJson(res, 200, {
        success: true,
        message: `Artifact "${slug}" and associated unshared media removed successfully`
      });
    }

    // Default 405 Method Not Allowed
    return sendJson(res, 405, { error: `Method ${method} not allowed for ${pathname}` });
  } catch (err) {
    console.error('[ArtifactDevAPI Error]:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
}
