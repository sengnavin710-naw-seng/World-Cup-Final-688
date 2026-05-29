import type { NewsItem, Team } from "../../lib/types";

type NewsTabProps = {
  news: NewsItem[];
  selectedTeam: Team | null;
};

export function NewsTab({ news, selectedTeam }: NewsTabProps) {
  const featured = news.find((item) => item.isFeatured) ?? news[0];
  const listItems = news.filter((item) => item.id !== featured?.id);
  const spotlight = news.find((item) => item.teamCode === selectedTeam?.code);

  return (
    <div className="news-layout">
      <div className="featured-story">
        <div className="featured-image" />
        <div className="news-card">
          <div className="summary-label">Featured Story</div>
          <h3 className="panel-title">{featured?.title}</h3>
          <p className="selection-subtitle" style={{ marginTop: 0 }}>
            {featured?.summary}
          </p>
        </div>
      </div>

      {spotlight ? (
        <div className="news-card">
          <div className="summary-label">Team Spotlight</div>
          <h3 className="panel-title">{spotlight.title}</h3>
          <p className="selection-subtitle" style={{ marginTop: 0 }}>
            {spotlight.summary}
          </p>
        </div>
      ) : null}

      <div className="news-layout">
        {listItems.map((item) => (
          <div key={item.id} className="news-card">
            <h4 style={{ marginTop: 0 }}>{item.title}</h4>
            <p className="selection-subtitle" style={{ marginTop: 0 }}>
              {item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
