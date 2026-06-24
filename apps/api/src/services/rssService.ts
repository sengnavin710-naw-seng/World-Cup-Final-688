import Parser from "rss-parser";

export type RssNewsItem = {
  id: string;
  title: string;
  summary: string;
  link: string;
  imageUrl?: string;
  pubDate?: string;
  author?: string;
  source: string;
  isFeatured?: boolean;
};

const RSS_FEEDS = [
  {
    source: "The Independent",
    url: "https://www.independent.co.uk/sport/football/world-cup/rss",
  },
];

// In-memory cache — 15 minutes
const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedItems: RssNewsItem[] = [];
let cacheExpiresAt = 0;

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["dc:creator", "dcCreator"],
    ],
  },
});

function extractImageUrl(item: Record<string, unknown>): string | undefined {
  const media = item.mediaContent as
    | { $?: { url?: string }; url?: string }
    | undefined;
  if (media?.$?.url) return media.$.url;
  if (media?.url) return media.url;

  // Fallback: look for <img> in description/content
  const html = (item.content ?? item.description ?? "") as string;
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match?.[1];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchFeed(
  source: string,
  url: string,
): Promise<RssNewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items ?? []).slice(0, 12).map((item, index) => {
      const raw = item as unknown as Record<string, unknown>;
      return {
        id: String(item.guid ?? item.link ?? `${source}-${index}`),
        title: item.title ?? "",
        summary: stripHtml(String(item.contentSnippet ?? raw["content"] ?? raw["description"] ?? "")),
        link: item.link ?? "",
        imageUrl: extractImageUrl(raw),
        pubDate: item.pubDate ?? item.isoDate,
        author: String(raw.dcCreator ?? item.creator ?? ""),
        source,
        isFeatured: index === 0,
      };
    });
  } catch {
    return [];
  }
}

export async function getNewsFromRss(): Promise<RssNewsItem[]> {
  if (Date.now() < cacheExpiresAt && cachedItems.length > 0) {
    return cachedItems;
  }

  const results = await Promise.all(
    RSS_FEEDS.map((feed) => fetchFeed(feed.source, feed.url)),
  );

  const merged = results.flat();
  // Sort by pubDate descending
  merged.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  // Mark first item as featured
  if (merged[0]) merged[0].isFeatured = true;

  cachedItems = merged;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  return cachedItems;
}
