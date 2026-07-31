import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, Star, Plus, Check } from "lucide-react";
import { getAuthToken } from "../utils/authStorage";
import { getForYouRecommendations } from "../services/api/recommendationApi";
import { createFavorite, getFavorites } from "../services/api/favoriteApi";
import { useToast } from "../contexts/ToastContext";
import PageHeader from "../components/PageHeader";

const HEADSHOT_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const HITTER_STATS = [
  { key: "ops",         label: "OPS",  fmt: (v) => v?.toFixed(3) ?? "—" },
  { key: "homeRuns",    label: "HR",   fmt: (v) => v ?? "—" },
  { key: "stolenBases", label: "SB",   fmt: (v) => v ?? "—" },
];

const PITCHER_STATS = [
  { key: "era",        label: "ERA", fmt: (v) => v?.toFixed(2) ?? "—" },
  { key: "strikeouts", label: "K",   fmt: (v) => v ?? "—" },
  { key: "wins",       label: "W",   fmt: (v) => v ?? "—" },
];

// ── 類似度スコアバー ──────────────────────────────────────────────────────────
function SimScore({ pct }) {
  const color =
    pct >= 90 ? "var(--ctp-green)"
    : pct >= 75 ? "var(--ctp-sapphire)"
    : "var(--ctp-peach)";
  return (
    <div className="foryou-sim-score">
      <span className="foryou-sim-pct" style={{ color }}>{pct}%</span>
      <div className="foryou-sim-bar-bg">
        <div className="foryou-sim-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── スタット比較テーブル ───────────────────────────────────────────────────────
function StatComparison({ seedName, seedStats, matchStats, playerType }) {
  const rows = playerType === "pitcher" ? PITCHER_STATS : HITTER_STATS;
  const seedLabel = seedName.split(" ").slice(-1)[0];
  return (
    <div className="foryou-stat-comparison">
      <div className="foryou-stat-header">
        <span />
        <span className="foryou-stat-col-label foryou-stat-col-match">This player</span>
        <span className="foryou-stat-col-label foryou-stat-col-seed">{seedLabel}</span>
      </div>
      {rows.map(({ key, label, fmt }) => (
        <div key={key} className="foryou-stat-row">
          <span className="foryou-stat-key">{label}</span>
          <span className="foryou-stat-val foryou-stat-col-match">{fmt(matchStats?.[key])}</span>
          <span className="foryou-stat-val foryou-stat-col-seed">{fmt(seedStats?.[key])}</span>
        </div>
      ))}
    </div>
  );
}

// ── 推薦カード ────────────────────────────────────────────────────────────────
function ForYouCard({ match, seedPlayer, isSaved, onSave, saving }) {
  return (
    <div className="foryou-card">
      <div className="foryou-card-top">
        <Link to={`/players/${match.mlbPlayerId}`} className="foryou-card-player-link">
          <img
            src={HEADSHOT_URL(match.mlbPlayerId)}
            alt={match.name}
            className="foryou-card-img"
            onError={(e) => { e.currentTarget.style.opacity = "0.4"; }}
          />
          <div className="foryou-card-info">
            <p className="foryou-card-name">{match.name}</p>
            <p className="foryou-card-meta">
              {match.position} · {match.team}
              {match.age ? ` · Age ${match.age}` : ""}
            </p>
          </div>
        </Link>
        <button
          className={`foryou-save-btn${isSaved ? " foryou-save-btn--saved" : ""}`}
          onClick={() => !isSaved && onSave(match)}
          disabled={isSaved || saving === match.mlbPlayerId}
          title={isSaved ? "Already in favorites" : "Add to favorites"}
        >
          {isSaved ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
        </button>
      </div>

      <SimScore pct={Math.round(match.matchScore ?? match.similarityPercentage)} />

      {match.reason && <p className="foryou-card-reason">{match.reason}</p>}

      <StatComparison
        seedName={seedPlayer.name}
        seedStats={seedPlayer.keyStats}
        matchStats={match.keyStats}
        playerType={match.playerType}
      />

      <Link to={`/scout/${match.mlbPlayerId}`} className="foryou-scout-btn">
        Scouting Report →
      </Link>
    </div>
  );
}

// ── シード選手グループ ─────────────────────────────────────────────────────────
function SeedGroup({ group, savedIds, onSave, saving }) {
  const { seedPlayer, matches } = group;
  const isPitcher = seedPlayer.playerType === "pitcher";
  const statsRows = isPitcher ? PITCHER_STATS : HITTER_STATS;

  return (
    <section className="foryou-group">
      <div className="foryou-seed-card">
        <div className="foryou-seed-img-wrap">
          <img
            src={HEADSHOT_URL(seedPlayer.mlbPlayerId)}
            alt={seedPlayer.name}
            className="foryou-seed-portrait"
            onError={(e) => { e.currentTarget.style.opacity = "0.4"; }}
          />
        </div>
        <div className="foryou-seed-body">
          <p className="foryou-group-because">Because you like</p>
          <p className="foryou-group-name">{seedPlayer.name}</p>
          <div className="foryou-seed-stats">
            {statsRows.map(({ key, label, fmt }) => (
              <span key={key} className="foryou-seed-stat">
                <span className="foryou-seed-stat-val">{fmt(seedPlayer.keyStats?.[key])}</span>
                <span className="foryou-seed-stat-lbl">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="foryou-cards">
        {matches.map((match) => (
          <ForYouCard
            key={match.mlbPlayerId}
            match={match}
            seedPlayer={seedPlayer}
            isSaved={savedIds.has(Number(match.mlbPlayerId))}
            onSave={onSave}
            saving={saving}
          />
        ))}
      </div>
    </section>
  );
}

// ── スケルトン ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <>
      {[0, 1].map((i) => (
        <div key={i} className="foryou-group">
          <div className="skeleton-block" style={{ height: 78, borderRadius: 14, marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 16, overflow: "hidden" }}>
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton-block" style={{ minWidth: 300, width: 300, height: 200, borderRadius: 18, flexShrink: 0 }} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ── For You ページ ────────────────────────────────────────────────────────────
function ForYouPage() {
  const token = getAuthToken();
  const { addToast } = useToast();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [saving, setSaving]     = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      getForYouRecommendations(token),
      getFavorites(token).catch(() => []),
    ]).then(([rec, favs]) => {
      setData(rec ?? { groups: [], fallback: [] });
      setSavedIds(new Set(favs.map((f) => Number(f.mlbPlayerId))));
    }).catch(() => {
      setData({ groups: [], fallback: [] });
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (match) => {
    if (!token) return;
    setSaving(match.mlbPlayerId);
    try {
      await createFavorite(match, token);
      setSavedIds((prev) => new Set([...prev, Number(match.mlbPlayerId)]));
      addToast(`${match.name} added to favorites!`, "success");
    } catch (err) {
      addToast(err.message || "Failed to add favorite.", "error");
    } finally {
      setSaving(null);
    }
  };

  const groups   = data?.groups   ?? [];
  const fallback = data?.fallback ?? [];

  return (
    <div className="app-screen">
      <PageHeader
        kicker="Personalized"
        title="For You"
        subtitle="Players matched to your favorites by playstyle"
      />

      <div className="screen-body px-5 py-4 w-full">

        {/* 未ログイン */}
        {!token && (
          <div className="foryou-empty">
            <Sparkles size={40} strokeWidth={1.5} className="foryou-empty-icon" />
            <p className="foryou-empty-title">Personalized picks, just for you</p>
            <p className="foryou-empty-desc">
              Add players to your Favorites and we&apos;ll find similar players across the league.
            </p>
            <Link to="/login" className="foryou-login-btn">Login to get started</Link>
          </div>
        )}

        {/* ローディング */}
        {token && loading && <Skeleton />}

        {/* グループ一覧 */}
        {token && !loading && groups.map((group) => (
          <SeedGroup
            key={group.seedPlayer.mlbPlayerId}
            group={group}
            savedIds={savedIds}
            onSave={handleSave}
            saving={saving}
          />
        ))}

        {/* フォールバック: お気に入りなし、またはレコメンドエンジンが一時的に利用不可 → 人気選手 */}
        {token && !loading && groups.length === 0 && fallback.length > 0 && (
          <section className="foryou-group">
            <div className="foryou-group-header foryou-group-header--fallback">
              <p className="foryou-group-name">Popular Players</p>
              {data?.degraded && (
                <p className="foryou-group-because" style={{ marginTop: 4 }}>
                  Couldn&apos;t find matches for your favorites right now — showing popular players instead.
                </p>
              )}
            </div>
            <div className="foryou-cards">
              {fallback.map((p) => (
                <div key={p.mlbPlayerId} className="foryou-card foryou-card--simple">
                  <Link to={`/players/${p.mlbPlayerId}`} className="foryou-card-player-link">
                    <img
                      src={HEADSHOT_URL(p.mlbPlayerId)}
                      alt={p.name}
                      className="foryou-card-img"
                      onError={(e) => { e.currentTarget.style.opacity = "0.4"; }}
                    />
                    <div className="foryou-card-info">
                      <p className="foryou-card-name">{p.name}</p>
                      <p className="foryou-card-meta">{p.team}</p>
                    </div>
                  </Link>
                  <Link to={`/scout/${p.mlbPlayerId}`} className="foryou-scout-btn">
                    Scouting Report →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 完全な空状態 */}
        {token && !loading && groups.length === 0 && fallback.length === 0 && (
          <div className="foryou-empty">
            <Star size={40} strokeWidth={1.5} className="foryou-empty-icon" />
            <p className="foryou-empty-title">Add players to get recommendations</p>
            <p className="foryou-empty-desc">
              Favorite a few MLB players and we&apos;ll find others who match their style.
            </p>
            <Link to="/favorites" className="foryou-login-btn">Go to Favorites</Link>
            <p className="foryou-empty-hint">
              Not sure who to add?{" "}
              <Link to="/recommendations" className="foryou-empty-quiz-link">Try the Discovery Quiz →</Link>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default ForYouPage;
