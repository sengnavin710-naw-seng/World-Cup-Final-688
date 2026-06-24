import type { NewsItem, Team } from "../../lib/types";

type NewsTabProps = {
  news: NewsItem[];
  selectedTeam: Team | null;
};

function timeAgo(pubDate?: string): string {
  if (!pubDate) return "";
  const diff = Date.now() - new Date(pubDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isBreaking(pubDate?: string): boolean {
  if (!pubDate) return false;
  const diff = Date.now() - new Date(pubDate).getTime();
  return diff < 60 * 60 * 1000; // within 1 hour
}

function NewsHeroCard({ item }: { item: NewsItem }) {
  return (
    <a
      className="news-hero-card"
      href={item.link ?? "#"}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="news-hero-image-wrap">
        {item.imageUrl ? (
          <img
            alt={item.title}
            className="news-hero-image"
            loading="eager"
            src={item.imageUrl}
          />
        ) : (
          <div className="news-hero-image-placeholder" />
        )}
        <div className="news-hero-overlay" />
      </div>
      <div className="news-hero-body">
        <div className="news-hero-meta">
          {isBreaking(item.pubDate) && (
            <span className="news-badge news-badge-live">LIVE</span>
          )}
          <span className="news-badge news-badge-featured">Featured</span>
          {item.source && (
            <span className="news-source">{item.source}</span>
          )}
        </div>
        <h2 className="news-hero-title">{item.title}</h2>
        {item.summary && (
          <p className="news-hero-summary">{item.summary}</p>
        )}
        <div className="news-hero-footer">
          {item.author && (
            <span className="news-author">{item.author}</span>
          )}
          {item.pubDate && (
            <span className="news-time">{timeAgo(item.pubDate)}</span>
          )}
        </div>
      </div>
    </a>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      className="news-card-link"
      href={item.link ?? "#"}
      rel="noopener noreferrer"
      target="_blank"
    >
      <article className="news-card">
        <div className="news-card-image-wrap">
          {item.imageUrl ? (
            <img
              alt={item.title}
              className="news-card-image"
              loading="lazy"
              src={item.imageUrl}
            />
          ) : (
            <div className="news-card-image-placeholder">
              <span className="news-card-placeholder-icon">⚽</span>
            </div>
          )}
          {isBreaking(item.pubDate) && (
            <span className="news-card-live-badge">LIVE</span>
          )}
        </div>
        <div className="news-card-body">
          <h3 className="news-card-title">{item.title}</h3>
          {item.summary && (
            <p className="news-card-summary">{item.summary}</p>
          )}
          <div className="news-card-footer">
            <span className="news-card-source">{item.source ?? "World Cup 2026"}</span>
            {item.pubDate && (
              <span className="news-card-time">{timeAgo(item.pubDate)}</span>
            )}
          </div>
        </div>
      </article>
    </a>
  );
}

export function NewsTab({ news, selectedTeam: _selectedTeam }: NewsTabProps) {
  if (news.length === 0) {
    return (
      <div className="news-empty">
        <div className="news-empty-icon">📰</div>
        <p className="news-empty-text">No news available right now.</p>
        <p className="news-empty-sub">Check back soon for World Cup 2026 updates.</p>
      </div>
    );
  }

  const [featured, ...rest] = news;

  return (
    <div className="news-layout">
      <div className="news-header">
        <span className="news-header-badge">⚽ World Cup 2026</span>
        <h2 className="news-header-title">Latest News</h2>
        <p className="news-header-sub">Live updates from The Independent</p>
      </div>

      {featured && <NewsHeroCard item={featured} />}

      {rest.length > 0 && (
        <div className="news-grid">
          {rest.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
