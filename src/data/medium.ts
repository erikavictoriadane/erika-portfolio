import fallbackArticles from './medium-fallback.json';

export interface MediumArticle {
  id: string;
  title: string;
  link: string;
  imageUrl: string;
  publishedAt: string;
  formattedDate: string;
  snippet: string;
  readTime: string;
  tags: string[];
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function formatTag(raw: string): string {
  const clean = raw.replace(/-/g, ' ').trim();
  return clean
    .split(' ')
    .map((w) => {
      if (['ai', 'seo', 'b2b', 'pr', 'kpi', 'cac', 'gtm'].includes(w.toLowerCase())) {
        return w.toUpperCase();
      }
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function formatDate(pubDate: string): string {
  try {
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return pubDate;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return pubDate;
  }
}

function extractSnippet(content: string, maxLen = 140): string {
  const ps = [...content.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) =>
      cleanHtmlEntities(m[1].replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(
      (p) =>
        !p.toLowerCase().startsWith('photo by') &&
        !p.toLowerCase().startsWith('image credit') &&
        !p.toLowerCase().startsWith('image by') &&
        !p.toLowerCase().startsWith('photo via') &&
        !p.toLowerCase().startsWith('@moki') &&
        p.length > 5
    );

  let text = '';
  for (const p of ps) {
    if (text) text += ' ';
    text += p;
    if (text.length >= maxLen) break;
  }

  if (!text) {
    // Fallback if no <p> tags found
    text = cleanHtmlEntities(content.replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (text.length > maxLen) {
    const trimmed = text.slice(0, maxLen);
    const lastSpace = trimmed.lastIndexOf(' ');
    return (lastSpace > 80 ? trimmed.slice(0, lastSpace) : trimmed) + '...';
  }

  return text;
}

export async function getMediumArticles(username = 'erikavictoriadane'): Promise<MediumArticle[]> {
  const feedUrl = `https://medium.com/feed/@${username}`;

  try {
    // 6-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PortfolioFeedReader/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[medium-feed] HTTP ${res.status} fetching Medium RSS feed. Using cached fallback.`);
      return fallbackArticles as MediumArticle[];
    }

    const xml = await res.text();
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

    if (!itemMatches.length) {
      console.warn('[medium-feed] No items found in Medium RSS feed. Using cached fallback.');
      return fallbackArticles as MediumArticle[];
    }

    const articles: MediumArticle[] = itemMatches.map((item, index) => {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const contentMatch =
        item.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) ||
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
      const content = contentMatch ? contentMatch[1] : '';
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"/) || item.match(/<img[^>]+src="([^">]+)"/);
      const rawCategories = [...item.matchAll(/<category><!\[CDATA\[(.*?)\]\]><\/category>/g)].map((m) => m[1]);

      const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = plainText.split(/\s+/).filter(Boolean);
      const readTimeMinutes = Math.max(1, Math.ceil(words.length / 225));

      const rawTitle = titleMatch ? titleMatch[1] : `Story ${index + 1}`;
      const rawLink = linkMatch ? linkMatch[1] : `https://medium.com/@${username}`;
      const rawPubDate = pubDateMatch ? pubDateMatch[1] : '';

      return {
        id: `medium-${index + 1}`,
        title: cleanHtmlEntities(rawTitle).trim(),
        link: rawLink.replace(/\?source=rss.*$/, ''),
        imageUrl: imgMatch ? imgMatch[1] : '',
        publishedAt: rawPubDate,
        formattedDate: formatDate(rawPubDate),
        snippet: extractSnippet(content),
        readTime: `${readTimeMinutes} min read`,
        tags: rawCategories.map(formatTag).slice(0, 3),
      };
    });

    return articles;
  } catch (error) {
    console.warn('[medium-feed] Failed to fetch Medium RSS feed:', (error as Error).message, '— using fallback.');
    return fallbackArticles as MediumArticle[];
  }
}
