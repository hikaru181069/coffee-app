import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLeaders } from "../services/api/statsApi";
import { getApiErrorMessage } from "../services/api/apiError";
import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";

const TABS = [
  { key: "hitting", label: "Position Players" },
  { key: "pitching", label: "Pitchers" },
];

const LEAGUES = [
  { key: "all", label: "MLB" },
  { key: "al", label: "AL" },
  { key: "nl", label: "NL" },
];

function LeaderTable({ category }) {
  return (
    <div className="stats-category-card">
      <div className="stats-category-header">
        <span className="stats-abbr">{category.abbr}</span>
        <span className="stats-label">{category.label}</span>
      </div>
      <ol className="stats-leader-list">
        {category.leaders.map((entry, idx) => (
          <li key={`${entry.playerId}-${idx}`} className="stats-leader-row">
            <span className={`stats-rank ${entry.rank === 1 ? "stats-rank--gold" : entry.rank === 2 ? "stats-rank--silver" : entry.rank === 3 ? "stats-rank--bronze" : ""}`}>
              {entry.rank}
            </span>
            <div className="stats-player-info">
              {entry.teamId && (
                <img
                  src={`https://www.mlbstatic.com/team-logos/${entry.teamId}.svg`}
                  alt={entry.teamName}
                  className="stats-team-logo"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <Link
                to={`/players/${entry.playerId}`}
                className="stats-player-name"
              >
                {entry.playerName}
              </Link>
              <span className="stats-team-name">{entry.teamName}</span>
            </div>
            <span className="stats-value">{entry.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SkeletonLeaderTable() {
  return (
    <div className="stats-category-card stats-category-card--skeleton">
      <div className="stats-category-header">
        <span className="skeleton-block" style={{ width: "3rem", height: "1.25rem", borderRadius: "4px" }} />
        <span className="skeleton-block" style={{ width: "5rem", height: "1rem", borderRadius: "4px" }} />
      </div>
      <ol className="stats-leader-list">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="stats-leader-row">
            <span className="skeleton-block" style={{ width: "1.5rem", height: "1rem", borderRadius: "4px" }} />
            <div className="stats-player-info" style={{ flex: 1 }}>
              <span className="skeleton-block" style={{ width: "60%", height: "1rem", borderRadius: "4px" }} />
            </div>
            <span className="skeleton-block" style={{ width: "2.5rem", height: "1rem", borderRadius: "4px" }} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StatsPage() {
  const [activeTab, setActiveTab] = useState("hitting");
  const [league, setLeague] = useState("all");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const currentSeason = new Date().getFullYear();

  // hitting/pitching と MLB/AL/NL の組み合わせごとにキャッシュする
  const cacheKey = `${activeTab}-${league}`;

  useEffect(() => {
    if (data[cacheKey]) return;

    const fetchLeaders = async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        const result = await getLeaders({ type: activeTab, limit: 10, league });
        setData((prev) => ({ ...prev, [cacheKey]: result.categories }));
      } catch (error) {
        console.error("Stats fetch error:", error);
        setErrorMessage(getApiErrorMessage(error, "Failed to load stats."));
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, [cacheKey, activeTab, league, data]);

  const categories = data[cacheKey];

  return (
    <div className="app-screen">
      <PageHeader
        kicker={`${currentSeason} Season`}
        title="MLB Stats"
        subtitle="League leaders from the MLB Stats API."
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="screen-body px-6 py-6 w-full">
        <div className="page-header-tabs" style={{ marginBottom: "1rem" }}>
          {LEAGUES.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLeague(l.key)}
              className={`page-tab ${league === l.key ? "page-tab--active" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {errorMessage && <ErrorCard message={errorMessage} />}

        <div className="stats-grid">
          {loading || !categories
            ? Array.from({ length: 6 }, (_, i) => <SkeletonLeaderTable key={i} />)
            : categories.map((cat) => (
                <LeaderTable key={cat.category} category={cat} />
              ))}
        </div>
      </div>
    </div>
  );
}

export default StatsPage;
