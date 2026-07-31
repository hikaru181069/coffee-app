// ニュースページ
// URL: /news
// MLB 公式 RSS フィードを Express 経由で取得して一覧表示する。

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import NewsList from "../components/NewsList";
import ErrorCard from "../components/ErrorCard";
import { getNews } from "../services/api/newsApi";

function SkeletonNewsCard() {
  return (
    <div className="news-card news-card--skeleton">
      <div className="news-card-img-wrap skeleton-block" />
      <div className="news-card-body">
        <div className="skeleton-block" style={{ height: 15, borderRadius: 4, width: "92%" }} />
        <div className="skeleton-block" style={{ height: 15, borderRadius: 4, width: "70%", marginTop: 6 }} />
        <div className="skeleton-block" style={{ height: 11, borderRadius: 3, width: "42%", marginTop: 14 }} />
      </div>
    </div>
  );
}

function NewsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchNews = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getNews(24);
        if (active) setItems(data.items);
      } catch {
        if (active) setError("Failed to load news.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchNews();
    return () => { active = false; };
  }, []);

  return (
    <div className="app-screen">
      <PageHeader
        kicker="MLB.com"
        title="News"
        subtitle="Latest news and stories from around Major League Baseball."
      />
      <div className="screen-body px-6 py-6 w-full">
        {loading && (
          <div className="news-list">
            {Array.from({ length: 12 }, (_, i) => <SkeletonNewsCard key={i} />)}
          </div>
        )}
        {error && <ErrorCard message={error} />}
        {!loading && !error && <NewsList items={items} />}
      </div>
    </div>
  );
}

export default NewsPage;
