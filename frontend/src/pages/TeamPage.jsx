// チームページ（汎用）
// URL: /team/:teamId   例) /team/147
//
// 任意の1球団のハブページ。ヘッダーに基本情報＋順位/勝敗を表示し、
// 3つのタブで内訳を切り替える:
//   [Roster]   ロスター一覧（投手 / 野手）
//   [Schedule] 直近〜今後の試合
//   [Leaders]  チーム内の打撃/投球リーダー
//
// データの流れ:
//   ヘッダー    → GET /api/teams/:teamId
//   Roster タブ → GET /api/external/players/team/:teamId
//   Schedule    → GET /api/teams/:teamId/schedule
//   Leaders     → GET /api/teams/:teamId/leaders
// すべて MLB Stats API 由来の公開データなのでログイン不要。

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, BarChart2 } from "lucide-react";

import PlayerCard from "../components/PlayerCard";
import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";
import SkeletonCard from "../components/SkeletonCard";
import { getExternalPlayersByTeam } from "../services/api/externalPlayerApi";
import { getTeam, getTeamSchedule, getTeamLeaders, getTeamInjuries } from "../services/api/teamApi";
import { mlbTeams } from "../services/mlbTeams";
import { getTeamColor } from "../services/teamColors";
import { getApiErrorMessage } from "../services/api/apiError";
import { formatGameDate } from "../utils/datetime";

const SKELETON_COUNT = 12;

const TABS = [
  { key: "roster", label: "Roster" },
  { key: "schedule", label: "Schedule" },
  { key: "leaders", label: "Leaders" },
];

const headshotUrl = (playerId) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_60,q_auto:best/v1/people/${playerId}/headshot/67/current`;

// ── Roster タブ ──────────────────────────────────────────────────────────────
function RosterSection({ title, players, loading, skeletonCount }) {
  if (loading) {
    return (
      <section className="home-player-section">
        <div className="section-heading-row">
          <div className="section-heading">
            <h2>{title}</h2>
          </div>
        </div>
        <div className="player-list">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (players.length === 0) return null;

  return (
    <section className="home-player-section">
      <div className="section-heading-row">
        <div className="section-heading">
          <h2>
            {title}
            <span className="count-badge">{players.length}</span>
          </h2>
        </div>
      </div>
      <div className="player-list">
        {players.map((player) => (
          <PlayerCard
            key={player.playerId || player.mlbPlayerId}
            player={player}
          />
        ))}
      </div>
    </section>
  );
}

function RosterTab({ teamId }) {
  const [players, setPlayers] = useState([]);
  const [injured, setInjured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchTeamRoster = async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        const teamPlayers = await getExternalPlayersByTeam(teamId);
        setPlayers(teamPlayers);
      } catch (error) {
        console.error("Team roster fetch error:", error);
        setErrorMessage(getApiErrorMessage(error, "Failed to load team roster."));
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTeamRoster();
  }, [teamId]);

  // 負傷者リストは補助情報なので別 effect・失敗は無視
  useEffect(() => {
    let active = true;
    getTeamInjuries(teamId)
      .then((data) => { if (active) setInjured(data.injured); })
      .catch(() => {});
    return () => { active = false; };
  }, [teamId]);

  const { pitchers, positionPlayers } = useMemo(() => {
    return {
      pitchers: players.filter((p) => p.playerType === "pitcher"),
      positionPlayers: players.filter((p) => p.playerType !== "pitcher"),
    };
  }, [players]);

  return (
    <div>
      {errorMessage && <ErrorCard message={errorMessage} />}

      {!loading && !errorMessage && players.length === 0 && (
        <div className="home-empty-state">
          <span className="empty-state-icon"><img src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg" alt="" width={36} height={36} style={{ opacity: 0.5 }} /></span>
          <p className="empty-state-title">No players found</p>
          <p className="empty-state-desc">
            Could not load the roster for this team.
          </p>
        </div>
      )}

      {/* 負傷者リスト（IL） */}
      {injured.length > 0 && (
        <section className="home-player-section">
          <div className="section-heading-row">
            <div className="section-heading">
              <h2>Injured List<span className="count-badge">{injured.length}</span></h2>
            </div>
          </div>
          <div className="injury-list">
            {injured.map((p) => (
              <Link key={p.playerId} to={`/players/${p.playerId}`} className="injury-row">
                <span className="injury-name">{p.playerName}</span>
                <span className="injury-pos">{p.position}</span>
                <span className="injury-status">{p.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RosterSection
        title="Pitchers"
        players={pitchers}
        loading={loading}
        skeletonCount={Math.ceil(SKELETON_COUNT / 2)}
      />
      <RosterSection
        title="Position Players"
        players={positionPlayers}
        loading={loading}
        skeletonCount={Math.ceil(SKELETON_COUNT / 2)}
      />
    </div>
  );
}

// ── Schedule タブ ────────────────────────────────────────────────────────────
function ScheduleCard({ game, teamId }) {
  const { away, home, status, abstractState, gameDate } = game;
  const isFinal = abstractState === "Final";
  const isLive = abstractState === "Live";

  // このページのチームから見た勝敗（試合終了時のみ）
  const teamSide = home.teamId === Number(teamId) ? home : away;
  const result = isFinal ? (teamSide.isWinner ? "W" : "L") : null;

  // 日本時間（JST）の日付ラベル
  const dateLabel = formatGameDate(gameDate, { month: "short", year: undefined });

  return (
    <div className="score-card">
      <div className="schedule-card-top">
        <span className="schedule-date">{dateLabel}</span>
        <span className={`score-status-badge${isLive ? " score-status-badge--live" : ""}`}>
          {isLive ? "● LIVE" : status}
        </span>
      </div>
      {[away, home].map((team, i) => {
        const isWinner = isFinal && team.isWinner;
        return (
          <div
            key={i}
            className={`score-team-row${isWinner ? " score-team-row--winner" : ""}`}
          >
            <Link to={`/team/${team.teamId}`} className="score-team">
              <img
                src={`https://www.mlbstatic.com/team-logos/${team.teamId}.svg`}
                alt={team.teamName}
                className="score-team-logo"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="score-team-name">{team.teamName}</span>
            </Link>
            <span className="score-team-score">{team.score ?? "–"}</span>
          </div>
        );
      })}
      {result && (
        <div className={`schedule-result schedule-result--${result === "W" ? "win" : "loss"}`}>
          {result === "W" ? "Win" : "Loss"}
        </div>
      )}
    </div>
  );
}

function ScheduleTab({ teamId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getTeamSchedule(teamId);
        setGames(data.games);
      } catch {
        setError("Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId]);

  if (loading) return (
    <div className="scores-grid">
      {Array.from({ length: 8 }, (_, i) => <SkeletonScheduleCard key={i} />)}
    </div>
  );
  if (error) return <ErrorCard message={error} />;

  if (games.length === 0) {
    return (
      <div className="home-empty-state">
        <span className="empty-state-icon"><CalendarDays size={36} strokeWidth={1.5} /></span>
        <p className="empty-state-title">No games scheduled</p>
        <p className="empty-state-desc">
          No recent or upcoming games for this team.
        </p>
      </div>
    );
  }

  return (
    <div className="scores-grid">
      {games.map((g) => (
        <ScheduleCard key={g.gamePk} game={g} teamId={teamId} />
      ))}
    </div>
  );
}

function SkeletonScheduleCard() {
  return (
    <div className="score-card">
      <div className="skeleton-block" style={{ height: 11, width: 70, borderRadius: 3, marginBottom: 10 }} />
      {[0, 1].map((i) => (
        <div key={i} className="score-team-row">
          <div className="skeleton-block" style={{ height: 20, width: 20, borderRadius: "50%" }} />
          <div className="skeleton-block" style={{ height: 13, flex: 1, borderRadius: 4, marginLeft: 8 }} />
          <div className="skeleton-block" style={{ height: 18, width: 24, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

function SkeletonLeaderCard() {
  return (
    <div className="leader-card">
      <div className="skeleton-block" style={{ height: 13, width: 100, borderRadius: 4, marginBottom: 12 }} />
      {[1, 2, 3].map((i) => (
        <div key={i} className="leader-row" style={{ pointerEvents: "none" }}>
          <div className="skeleton-block" style={{ height: 12, width: 16, borderRadius: 3 }} />
          <div className="skeleton-block" style={{ height: 32, width: 32, borderRadius: "50%", margin: "0 8px" }} />
          <div className="skeleton-block" style={{ height: 13, flex: 1, borderRadius: 4 }} />
          <div className="skeleton-block" style={{ height: 13, width: 36, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

// ── Leaders タブ ─────────────────────────────────────────────────────────────
function LeaderCard({ leader }) {
  if (leader.leaders.length === 0) return null;

  return (
    <div className="leader-card">
      <p className="leader-card-title">{leader.label}</p>
      <div className="leader-list">
        {leader.leaders.map((p) => (
          <Link key={p.playerId} to={`/players/${p.playerId}`} className="leader-row">
            <span className="leader-rank">{p.rank}</span>
            <img
              src={headshotUrl(p.playerId)}
              alt={p.playerName}
              className="leader-headshot"
              onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
            />
            <span className="leader-name">{p.playerName}</span>
            <span className="leader-value">{p.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LeadersTab({ teamId, season }) {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getTeamLeaders(teamId, season);
        setLeaders(data.leaders);
      } catch {
        setError("Failed to load leaders.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [teamId, season]);

  if (loading) return (
    <div className="leader-cards-grid">
      {Array.from({ length: 4 }, (_, i) => <SkeletonLeaderCard key={i} />)}
    </div>
  );
  if (error) return <ErrorCard message={error} />;

  const hasAny = leaders.some((l) => l.leaders.length > 0);
  if (!hasAny) {
    return (
      <div className="home-empty-state">
        <span className="empty-state-icon"><BarChart2 size={36} strokeWidth={1.5} /></span>
        <p className="empty-state-title">No leaders yet</p>
        <p className="empty-state-desc">
          No stat leaders are available for this season.
        </p>
      </div>
    );
  }

  return (
    <div className="leaders-grid">
      {leaders.map((l) => (
        <LeaderCard key={l.category} leader={l} />
      ))}
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────────────────────
function TeamPage() {
  const { teamId } = useParams();
  const season = new Date().getFullYear();

  const [activeTab, setActiveTab] = useState("roster");
  const [team, setTeam] = useState(null);

  // 静的データから即座に名前・略称を引く（API待ちの間のフォールバック）
  const fallbackTeam = useMemo(
    () => mlbTeams.find((t) => t.id === Number(teamId)),
    [teamId],
  );

  // ヘッダー用のチーム情報（基本情報 + 順位/勝敗）はページ単位で1回だけ取得
  useEffect(() => {
    let active = true;
    const fetchTeam = async () => {
      try {
        const data = await getTeam(teamId, season);
        if (active) setTeam(data);
      } catch (error) {
        console.error("Team fetch error:", error);
        if (active) setTeam(null);
      }
    };
    fetchTeam();
    return () => {
      active = false;
    };
  }, [teamId, season]);

  const displayName = team?.name ?? fallbackTeam?.name ?? "Team";
  const record = team?.record;
  const teamColor = getTeamColor(teamId);

  const subtitle = [team?.division, team?.venue && `📍 ${team.venue}`]
    .filter(Boolean)
    .join(" · ");

  // 成績はヘッダー右側に出す（PageHeader の right スロット）
  const recordRight = record ? (
    <>
      <span className="thr-wl">
        {record.wins}-{record.losses}
      </span>
      <span className="thr-sub">
        {`#${record.divisionRank} · ${record.pct} · L10 ${record.lastTen} · ${record.streak}`}
      </span>
    </>
  ) : null;

  return (
    <div className="app-screen">
      <PageHeader
        backTo="/league"
        backLabel="League"
        kicker={`${season} Season`}
        logo={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
        title={displayName}
        subtitle={subtitle}
        right={recordRight}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="screen-body px-6 py-6 w-full">
        {activeTab === "roster" && <RosterTab teamId={teamId} />}
        {activeTab === "schedule" && <ScheduleTab teamId={teamId} />}
        {activeTab === "leaders" && <LeadersTab teamId={teamId} season={season} />}
      </div>
    </div>
  );
}

export default TeamPage;
