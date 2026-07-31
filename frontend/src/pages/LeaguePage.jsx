// リーグページ: 30球団の試合成績を2つのタブで表示
//   [Standings] 順位表（リーグ → 地区 → 球団）
//   [Scores]    指定日の全試合スコア
//
// データの流れ:
//   Standings タブ → GET /api/league/standings?season=YYYY
//   Scores タブ    → GET /api/league/scores?date=YYYY-MM-DD（日付ピッカーで切替）

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStandings, getScores, getWildCard } from "../services/api/leagueApi";
import { getLeaders, getHotPlayers } from "../services/api/statsApi";
import ScoreCard from "../components/ScoreCard";
import ErrorCard from "../components/ErrorCard";
import PageHeader from "../components/PageHeader";
import { CalendarDays } from "lucide-react";
import { mlbToday } from "../utils/datetime";

const TABS = [
  { key: "standings", label: "Standings" },
  { key: "wildcard",  label: "Wild Card" },
  { key: "scores",    label: "Scores"    },
  { key: "leaders",   label: "Leaders"   },
  { key: "hot",       label: "Hot"       },
];

// 地区の表示順（AL → NL、East → Central → West）
const DIVISION_ORDER = [
  "American League East",
  "American League Central",
  "American League West",
  "National League East",
  "National League Central",
  "National League West",
];

const LEAGUE_ORDER = ["American League", "National League"];

// ── Skeleton helpers ─────────────────────────────────────────────────────────

function SkeletonStandingsRow() {
  return (
    <div className="standings-row">
      <div className="standings-team-col">
        <div className="skeleton-block" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0 }} />
        <div className="skeleton-block" style={{ width: 88, height: 13, borderRadius: 3 }} />
      </div>
      {[28, 28, 40, 34, 40, 36].map((w, i) => (
        <div key={i} className="skeleton-block" style={{ height: 11, width: w * 0.55, borderRadius: 3, margin: "0 auto" }} />
      ))}
    </div>
  );
}

function SkeletonStandingsDivision() {
  return (
    <div className="standings-division">
      <div className="skeleton-block" style={{ height: 14, width: 130, borderRadius: 4, margin: "12px 16px 8px" }} />
      <div className="standings-table">
        <div className="standings-row standings-row--head">
          <span className="standings-team-col">Team</span>
          <span>W</span><span>L</span><span>PCT</span><span>GB</span>
          <span className="standings-hide-sm">L10</span>
          <span className="standings-hide-sm">STRK</span>
        </div>
        {Array.from({ length: 5 }, (_, i) => <SkeletonStandingsRow key={i} />)}
      </div>
    </div>
  );
}

function SkeletonStandingsTab() {
  return (
    <div className="standings-grid">
      {["American League", "National League"].map((league) => (
        <section key={league} className="standings-league-column">
          <h2 className="standings-league-title">{league}</h2>
          {Array.from({ length: 3 }, (_, i) => <SkeletonStandingsDivision key={i} />)}
        </section>
      ))}
    </div>
  );
}

function SkeletonLeaderRow() {
  return (
    <div className="leaders-list-row" style={{ pointerEvents: "none" }}>
      <div className="skeleton-block leaders-rank" style={{ width: 18, height: 14, borderRadius: 3 }} />
      <div className="skeleton-block leaders-list-headshot" />
      <div className="leaders-list-info" style={{ flex: 1 }}>
        <div className="skeleton-block" style={{ width: 110, height: 14, borderRadius: 3 }} />
        <div className="skeleton-block" style={{ width: 80, height: 11, borderRadius: 3, marginTop: 4 }} />
      </div>
      <div className="skeleton-block" style={{ width: 38, height: 16, borderRadius: 3 }} />
    </div>
  );
}

function SkeletonLeadersTab() {
  return (
    <div className="leaders-tabs-wrap">
      <div className="leaders-tab-bar">
        <div className="skeleton-block" style={{ height: 32, width: 80, borderRadius: 8 }} />
        <div className="skeleton-block" style={{ height: 32, width: 80, borderRadius: 8 }} />
      </div>
      <div className="leaders-cat-chips" style={{ marginTop: 12 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton-block" style={{ height: 28, width: 48, borderRadius: 20 }} />
        ))}
      </div>
      <div className="leaders-list" style={{ marginTop: 12 }}>
        {Array.from({ length: 5 }, (_, i) => <SkeletonLeaderRow key={i} />)}
      </div>
    </div>
  );
}

function SkeletonScoreCard() {
  return (
    <div className="score-card">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <div className="skeleton-block" style={{ height: 11, width: 50, borderRadius: 3 }} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="score-team-row">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="skeleton-block" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0 }} />
            <div className="skeleton-block" style={{ width: 100, height: 13, borderRadius: 3 }} />
          </div>
          <div className="skeleton-block" style={{ width: 22, height: 18, borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}

// ── Standings タブ ───────────────────────────────────────────────────────────
function StandingsTab({ season }) {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getStandings(season);
        // 地区を決まった順に並べ替え
        const sorted = [...data.divisions].sort((a, b) => {
          const aKey = `${a.league} ${a.division}`;
          const bKey = `${b.league} ${b.division}`;
          return DIVISION_ORDER.indexOf(aKey) - DIVISION_ORDER.indexOf(bKey);
        });
        setDivisions(sorted);
      } catch {
        setError("Failed to load standings.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [season, retryKey]);

  if (loading) return <SkeletonStandingsTab />;
  if (error) return <ErrorCard message={error} onRetry={() => setRetryKey((k) => k + 1)} />;

  const divisionsByLeague = LEAGUE_ORDER.map((league) => ({
    league,
    divisions: divisions.filter((div) => div.league === league),
  }));

  return (
    <div className="standings-grid">
      {divisionsByLeague.map(({ league, divisions: leagueDivisions }) => (
        <section key={league} className="standings-league-column">
          <h2 className="standings-league-title">{league}</h2>
          {leagueDivisions.map((div) => (
            <div key={div.divisionId} className="standings-division">
              <p className="standings-division-title">
                <span>{div.division}</span>
              </p>
              <div className="standings-table">
                {/* ヘッダー行 */}
                <div className="standings-row standings-row--head">
                  <span className="standings-team-col">Team</span>
                  <span>W</span>
                  <span>L</span>
                  <span>PCT</span>
                  <span>GB</span>
                  <span className="standings-hide-sm">L10</span>
                  <span className="standings-hide-sm">STRK</span>
                </div>
                {/* 球団行 */}
                {div.teams.map((t, idx) => (
                  <div
                    key={t.teamId}
                    className={`standings-row${idx === 0 ? " standings-row--leader" : ""}`}
                  >
                    <Link
                      to={`/team/${t.teamId}`}
                      className="standings-team-col standings-team-link"
                    >
                      <img
                        src={`https://www.mlbstatic.com/team-logos/${t.teamId}.svg`}
                        alt={t.teamName}
                        className="standings-team-logo"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                      <span className="standings-team-name">{t.teamName}</span>
                    </Link>
                    <span className="standings-stat">{t.wins}</span>
                    <span className="standings-stat">{t.losses}</span>
                    <span className="standings-stat">{t.pct}</span>
                    <span className="standings-stat">{t.gamesBack}</span>
                    <span className="standings-stat standings-hide-sm">{t.lastTen}</span>
                    <span className="standings-stat standings-hide-sm">{t.streak}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

// ── Scores タブ ──────────────────────────────────────────────────────────────
function ScoresTab() {
  // 日付は YYYY-MM-DD 文字列で管理
  // 「今日の試合日」は米国(ET)基準。日本の朝の試合は米国では前日扱いのため。
  const [date, setDate] = useState(mlbToday());
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getScores(date);
        setGames(data.games);
      } catch {
        setError("Failed to load scores.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  // 日付を1日ずらす
  const shiftDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="scores-wrap">
      {/* 日付ナビゲーション */}
      <div className="scores-date-nav">
        <button type="button" className="scores-date-btn" onClick={() => shiftDate(-1)}>
          ← Prev
        </button>
        <div className="scores-date-display">
          <span className="scores-date-text">{displayDate}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="scores-date-input"
          />
        </div>
        <button type="button" className="scores-date-btn" onClick={() => shiftDate(1)}>
          Next →
        </button>
      </div>

      {loading && (
        <div className="scores-grid">
          {Array.from({ length: 10 }, (_, i) => <SkeletonScoreCard key={i} />)}
        </div>
      )}
      {error && <ErrorCard message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

      {!loading && !error && games.length === 0 && (
        <div className="home-empty-state">
          <span className="empty-state-icon"><CalendarDays size={36} strokeWidth={1.5} /></span>
          <p className="empty-state-title">No games scheduled</p>
          <p className="empty-state-desc">There are no MLB games on this date.</p>
        </div>
      )}

      {!loading && games.length > 0 && (
        <div className="scores-grid">
          {games.map((g) => (
            <ScoreCard key={g.gamePk} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Wild Card タブ ───────────────────────────────────────────────────────────
function WildCardTab({ season }) {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); setError("");
      try {
        const data = await getWildCard(season);
        setLeagues(data.leagues);
      } catch { setError("Failed to load wild card standings."); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [season, retryKey]);

  if (loading) return <SkeletonStandingsTab />;
  if (error)   return <ErrorCard message={error} onRetry={() => setRetryKey((k) => k + 1)} />;

  return (
    <div className="standings-grid">
      {leagues.map(({ league, teams }) => (
        <section key={league} className="standings-league-column">
          <h2 className="standings-league-title">{league}</h2>
          <div className="standings-table">
            <div className="standings-row standings-row--head">
              <span className="standings-team-col">Team</span>
              <span>W</span><span>L</span><span>PCT</span>
              <span>GB</span>
              <span className="standings-hide-sm">L10</span>
              <span className="standings-hide-sm">STRK</span>
            </div>
            {teams.map((t, idx) => (
              <div key={t.teamId}
                className={`standings-row${idx < 3 ? " standings-row--leader" : ""}`}>
                <Link to={`/team/${t.teamId}`}
                  className="standings-team-col standings-team-link">
                  <img src={`https://www.mlbstatic.com/team-logos/${t.teamId}.svg`}
                    alt={t.teamName} className="standings-team-logo"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <span className="standings-team-name">{t.teamName}</span>
                </Link>
                <span className="standings-stat">{t.wins}</span>
                <span className="standings-stat">{t.losses}</span>
                <span className="standings-stat">{t.pct}</span>
                <span className="standings-stat">{t.wildCardGamesBack}</span>
                <span className="standings-stat standings-hide-sm">{t.lastTen}</span>
                <span className="standings-stat standings-hide-sm">{t.streak}</span>
              </div>
            ))}
          </div>
          <p className="wc-note">Top 3 teams advance to Wild Card Series</p>
        </section>
      ))}
    </div>
  );
}

// ── League Leaders タブ ───────────────────────────────────────────────────────
const FEATURED_HITTING  = ["battingAverage", "homeRuns", "runsBattedIn", "stolenBases", "onBasePlusSlugging"];
const FEATURED_PITCHING = ["earnedRunAverage", "strikeouts", "saves"];

const HEADSHOT_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

function LeadersTab() {
  const [hitting, setHitting]   = useState([]);
  const [pitching, setPitching] = useState([]);
  const [tab, setTab]           = useState("hitting");
  const [catIdx, setCatIdx]     = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [h, p] = await Promise.all([
          getLeaders({ type: "hitting",  limit: 5 }),
          getLeaders({ type: "pitching", limit: 5 }),
        ]);
        setHitting(
          (h?.categories ?? [])
            .filter((c) => FEATURED_HITTING.includes(c.category))
            .sort((a, b) => FEATURED_HITTING.indexOf(a.category) - FEATURED_HITTING.indexOf(b.category)),
        );
        setPitching((p?.categories ?? []).filter((c) => FEATURED_PITCHING.includes(c.category)));
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const cats    = tab === "hitting" ? hitting : pitching;
  const current = cats[catIdx] ?? cats[0];

  const handleTabChange = (next) => { setTab(next); setCatIdx(0); };

  if (loading) return <SkeletonLeadersTab />;

  return (
    <div className="leaders-tabs-wrap">
      <div className="leaders-tab-bar">
        <button className={`leaders-tab${tab === "hitting"  ? " active" : ""}`} onClick={() => handleTabChange("hitting")}>Hitting</button>
        <button className={`leaders-tab${tab === "pitching" ? " active" : ""}`} onClick={() => handleTabChange("pitching")}>Pitching</button>
      </div>
      <div className="leaders-cat-chips">
        {cats.map((c, i) => (
          <button key={c.category} className={`leaders-cat-chip${catIdx === i ? " active" : ""}`} onClick={() => setCatIdx(i)}>
            {c.abbr}
          </button>
        ))}
      </div>
      {current && (
        <div className="leaders-list">
          {current.leaders.map((p) => (
            <Link key={p.playerId} to={`/players/${p.playerId}`} className="leaders-list-row">
              <span className="leaders-rank">{p.rank}</span>
              <img src={HEADSHOT_URL(p.playerId)} alt={p.playerName} className="leaders-list-headshot"
                onError={(e) => { e.currentTarget.style.opacity = "0.3"; }} />
              <div className="leaders-list-info">
                <span className="leaders-list-name">{p.playerName}</span>
                {p.teamId && (
                  <span className="leaders-list-team">
                    <img src={`https://www.mlbstatic.com/team-logos/${p.teamId}.svg`} alt={p.teamName}
                      width={14} height={14} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    {p.teamName}
                  </span>
                )}
              </div>
              <span className="leaders-list-value">{p.value}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hot Right Now タブ ────────────────────────────────────────────────────────
function HotTab() {
  const [hitters, setHitters]   = useState([]);
  const [pitchers, setPitchers] = useState([]);
  const [tab, setTab]           = useState("hitters");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getHotPlayers({ days: 14 });
        setHitters(data.hitters ?? []);
        setPitchers(data.pitchers ?? []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const players = tab === "hitters" ? hitters : pitchers;

  if (loading) return <SkeletonLeadersTab />;

  return (
    <div className="leaders-tabs-wrap home-hot-section">
      <div className="leaders-tab-bar">
        <button className={`leaders-tab${tab === "hitters"  ? " active" : ""}`} onClick={() => setTab("hitters")}>Hitters</button>
        <button className={`leaders-tab${tab === "pitchers" ? " active" : ""}`} onClick={() => setTab("pitchers")}>Pitchers</button>
      </div>
      <p className="hot-period-label">Last 14 days</p>
      <div className="leaders-list">
        {players.map((p, i) => (
          <Link key={p.playerId} to={`/players/${p.playerId}`} className="leaders-list-row">
            <span className="leaders-rank">{i + 1}</span>
            <img src={HEADSHOT_URL(p.playerId)} alt={p.playerName} className="leaders-list-headshot"
              onError={(e) => { e.currentTarget.style.opacity = "0.3"; }} />
            <div className="leaders-list-info">
              <span className="leaders-list-name">{p.playerName}</span>
              {p.teamId && (
                <span className="leaders-list-team">
                  <img src={`https://www.mlbstatic.com/team-logos/${p.teamId}.svg`} alt={p.teamName}
                    width={14} height={14} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  {p.teamName}
                </span>
              )}
            </div>
            <div className="hot-streak-stat">
              <span className="leaders-list-value" style={{ color: "var(--ctp-peach)" }}>{p.stat}</span>
              <span className="leaders-card-abbr">{p.statLabel}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────────────────────
function LeaguePage() {
  const [activeTab, setActiveTab] = useState("standings");
  const season = new Date().getFullYear();

  return (
    <div className="app-screen">
      <PageHeader
        kicker={`${season} Season`}
        title="League"
        subtitle="Standings and game scores for all 30 MLB teams."
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="screen-body px-6 py-6 w-full">
        {activeTab === "standings" && <StandingsTab season={season} />}
        {activeTab === "wildcard"  && <WildCardTab season={season} />}
        {activeTab === "scores"    && <ScoresTab />}
        {activeTab === "leaders"   && <LeadersTab />}
        {activeTab === "hot"       && <HotTab />}
      </div>
    </div>
  );
}

export default LeaguePage;
