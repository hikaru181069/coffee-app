import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

import { getAuthToken } from "../utils/authStorage";
import { getProspectRecommendations } from "../services/api/recommendationApi";
import ErrorCard from "../components/ErrorCard";
import PageHeader from "../components/PageHeader";

const HEADSHOT_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const TABS = [
  { key: "hitters",  label: "Hitters" },
  { key: "pitchers", label: "Pitchers" },
];

// ── 類似度スコアバー ──────────────────────────────────────────────────────────
function SimScore({ pct }) {
  const color =
    pct >= 90 ? "var(--ctp-green)"
    : pct >= 75 ? "var(--ctp-sapphire)"
    : "var(--ctp-peach)";
  return (
    <div className="prospect-sim-score">
      <span className="prospect-sim-pct" style={{ color }}>{pct}%</span>
      <div className="prospect-sim-bar-bg">
        <div className="prospect-sim-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="prospect-sim-label">match</span>
    </div>
  );
}

// ── プロスペクトカード ─────────────────────────────────────────────────────────
function ProspectCard({ prospect, showSim }) {
  const {
    playerId, fullName, level, team, parentOrg, parentOrgId,
    age, position, ops, homeRuns, stolenBases, era, strikeouts, wins,
    similarityPercentage, reason,
  } = prospect;

  const isPitcher = era > 0 && ops === 0;

  return (
    <Link to={`/players/${playerId}`} className="prospect-card">
      <div className="prospect-card-headshot">
        <img
          src={HEADSHOT_URL(playerId)}
          alt={fullName}
          className="prospect-card-img"
          onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
        />
        {parentOrgId && (
          <img
            src={`https://www.mlbstatic.com/team-logos/${parentOrgId}.svg`}
            alt={parentOrg}
            className="prospect-card-org-badge"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </div>

      <div className="prospect-card-body">
        <div className="prospect-card-meta">
          <span className="prospect-card-level">{level}</span>
          {age > 0 && <span className="prospect-card-age">Age {age}</span>}
          {position && <span className="prospect-card-pos">{position}</span>}
        </div>

        <p className="prospect-card-name">{fullName}</p>
        <p className="prospect-card-team">{parentOrg ? `${team} · ${parentOrg}` : team}</p>

        <div className="prospect-card-stats">
          {isPitcher ? (
            <>
              {era > 0 && (
                <span className="prospect-stat">
                  <span className="prospect-stat-val">{era.toFixed(2)}</span>
                  <span className="prospect-stat-label">ERA</span>
                </span>
              )}
              {strikeouts > 0 && (
                <span className="prospect-stat">
                  <span className="prospect-stat-val">{strikeouts}</span>
                  <span className="prospect-stat-label">K</span>
                </span>
              )}
              {wins > 0 && (
                <span className="prospect-stat">
                  <span className="prospect-stat-val">{wins}</span>
                  <span className="prospect-stat-label">W</span>
                </span>
              )}
            </>
          ) : (
            <>
              {ops > 0 && (
                <span className="prospect-stat">
                  <span className="prospect-stat-val">{ops.toFixed(3)}</span>
                  <span className="prospect-stat-label">OPS</span>
                </span>
              )}
              {homeRuns > 0 && (
                <span className="prospect-stat">
                  <span className="prospect-stat-val">{homeRuns}</span>
                  <span className="prospect-stat-label">HR</span>
                </span>
              )}
              {stolenBases > 0 && (
                <span className="prospect-stat">
                  <span className="prospect-stat-val">{stolenBases}</span>
                  <span className="prospect-stat-label">SB</span>
                </span>
              )}
            </>
          )}
        </div>

        {reason && <p className="prospect-card-reason">{reason}</p>}
      </div>

      {showSim && similarityPercentage != null && (
        <SimScore pct={similarityPercentage} />
      )}
    </Link>
  );
}

// ── スケルトン ────────────────────────────────────────────────────────────────
function SkeletonProspectCard() {
  return (
    <div className="prospect-card prospect-card--skeleton">
      <div className="skeleton-block" style={{ width: 56, height: 72, borderRadius: 8, flexShrink: 0 }} />
      <div className="prospect-card-body">
        <div className="skeleton-block" style={{ width: 60, height: 14, borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton-block" style={{ width: 130, height: 18, borderRadius: 4, marginBottom: 4 }} />
        <div className="skeleton-block" style={{ width: 90, height: 14, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ── ProspectsPage ─────────────────────────────────────────────────────────────
function ProspectsPage() {
  const token = getAuthToken();
  const [hitters, setHitters]     = useState([]);
  const [pitchers, setPitchers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("hitters");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getProspectRecommendations(token)
      .then(({ hitters: h, pitchers: p }) => {
        setHitters(h || []);
        setPitchers(p || []);
      })
      .catch((err) => setError(err.message || "Failed to load prospects."))
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div className="app-screen">
        <PageHeader kicker="Minor Leagues" title="Prospects to Watch" />
        <div className="screen-body px-6 py-16">
          <div className="home-empty-state">
            <span className="empty-state-icon"><TrendingUp size={36} strokeWidth={1.5} /></span>
            <p className="empty-state-title">Login to see prospects</p>
            <p className="empty-state-desc">We match minor league prospects to your favorite players.</p>
            <div className="home-actions">
              <Link className="home-link" to="/login">Login</Link>
              <Link className="home-link secondary" to="/register">Register</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const prospects = activeTab === "hitters" ? hitters : pitchers;
  const showSim   = prospects.some((p) => p.similarityPercentage != null);

  return (
    <div className="app-screen">
      <PageHeader
        kicker="Minor Leagues"
        title="Prospects to Watch"
        subtitle={showSim ? "AAA · AA players matched to your favorites" : "AAA · AA players to watch"}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="screen-body px-5 py-4 w-full">
        {error && <ErrorCard message={error} />}

        {loading ? (
          <div className="prospect-list">
            {Array.from({ length: 5 }, (_, i) => <SkeletonProspectCard key={i} />)}
          </div>
        ) : prospects.length === 0 ? (
          <p className="prospect-section-empty">No prospects available.</p>
        ) : (
          <div className="prospect-list">
            {prospects.map((p) => (
              <ProspectCard key={p.playerId} prospect={p} showSim={showSim} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProspectsPage;
