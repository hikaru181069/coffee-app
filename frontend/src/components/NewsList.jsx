// ニュース記事リスト（共有コンポーネント）
// NewsPage と TeamPage の News タブ、Home の News セクションで共用する。
// 記事は MLB 公式サイトへ新しいタブで開く（外部リンク）。

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function NewsList({ items, compact = false }) {
  if (!items || items.length === 0) {
    return (
      <div className="home-empty-state">
        <span className="empty-state-icon">
          <img
            src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg"
            alt=""
            width={36}
            height={36}
            style={{ opacity: 0.5 }}
          />
        </span>
        <p className="empty-state-title">No news available</p>
        <p className="empty-state-desc">Check back later for the latest MLB news.</p>
      </div>
    );
  }

  return (
    <div className={`news-list${compact ? " news-list--compact" : ""}`}>
      {items.map((item) => (
        <a
          key={item.link}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="news-card"
        >
          {item.image && (
            <div className="news-card-img-wrap">
              <img
                src={item.image}
                alt=""
                className="news-card-img"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </div>
          )}
          <div className="news-card-body">
            <h3 className="news-card-title">{item.title}</h3>
            <p className="news-card-meta">
              {item.author && <span>{item.author}</span>}
              {item.author && item.pubDate && <span className="news-card-dot">·</span>}
              {item.pubDate && <span>{timeAgo(item.pubDate)}</span>}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default NewsList;
