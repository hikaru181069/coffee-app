// 試合詳細ページ
// URL: /game/:gamePk
//
// League / Team / Home のスコアカードから遷移する1試合の詳細ビュー。
//   ヘッダー   : 対戦カード・最終スコア・状態・日時・球場
//   Line Score : イニングごとの得点 + R/H/E
//   Box Score  : Away/Home を切り替えて打者/投手スタッツ
//
// データ: GET /api/games/:gamePk（MLB Stats API を Express がまとめて整形）

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getGame, getGamePlays, getGameHighlights } from "../services/api/gameApi";
import { formatGameDate, formatGameTime } from "../utils/datetime";
import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";

// ── スケルトン ────────────────────────────────────────────────────────────────
function SkeletonHighlightCard() {
  return (
    <div className="highlight-card" style={{ pointerEvents: "none" }}>
      <div className="highlight-thumb-wrap skeleton-block" style={{ borderRadius: 6 }} />
      <div className="skeleton-block" style={{ height: 13, borderRadius: 4, width: "88%", margin: "8px 6px 4px" }} />
      <div className="skeleton-block" style={{ height: 13, borderRadius: 4, width: "60%", margin: "0 6px 6px" }} />
    </div>
  );
}

function SkeletonPlayRow() {
  return (
    <div className="pbp-row">
      <div className="pbp-inning">
        <div className="skeleton-block" style={{ height: 12, width: 24, borderRadius: 3 }} />
      </div>
      <div className="pbp-detail" style={{ gap: 6, display: "flex", flexDirection: "column" }}>
        <div className="skeleton-block" style={{ height: 13, borderRadius: 4, width: "80%" }} />
        <div className="skeleton-block" style={{ height: 13, borderRadius: 4, width: "55%" }} />
      </div>
    </div>
  );
}

function SkeletonGamePage() {
  return (
    <div className="app-screen">
      <div className="page-header">
        <div className="skeleton-block" style={{ height: 11, width: 120, borderRadius: 3, marginBottom: 8 }} />
        <div className="skeleton-block" style={{ height: 22, width: 220, borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton-block" style={{ height: 13, width: 140, borderRadius: 3 }} />
      </div>
      <div className="screen-body px-6 py-6 w-full">
        <div className="game-score-line">
          {[0, 1].map((i) => (
            <div key={i} className="game-score-team">
              <div className="skeleton-block" style={{ height: 36, width: 36, borderRadius: "50%" }} />
              <div className="skeleton-block" style={{ height: 14, width: 100, borderRadius: 4, marginLeft: 10 }} />
              <div className="skeleton-block" style={{ height: 28, width: 32, borderRadius: 4, marginLeft: "auto" }} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-block" style={{ height: 14, width: `${85 - i * 10}%`, borderRadius: 4, marginBottom: 10 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ハイライト動画 ───────────────────────────────────────────────────────────
function GameHighlights({ gamePk }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // 再生中の動画

  useEffect(() => {
    let alive = true;
    getGameHighlights(gamePk)
      .then((data) => { if (alive) setHighlights(data.highlights); })
      .catch(() => { if (alive) setHighlights([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [gamePk]);

  if (loading) return (
    <div className="highlight-grid">
      {Array.from({ length: 6 }, (_, i) => <SkeletonHighlightCard key={i} />)}
    </div>
  );
  if (highlights.length === 0) {
    return (
      <div className="home-empty-state">
        <span className="empty-state-icon">
          <img src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg" alt="" width={36} height={36} style={{ opacity: 0.5 }} />
        </span>
        <p className="empty-state-title">No highlights yet</p>
        <p className="empty-state-desc">Video highlights appear after the game.</p>
      </div>
    );
  }

  return (
    <>
      <div className="highlight-grid">
        {highlights.map((h) => (
          <button key={h.id} type="button" className="highlight-card" onClick={() => setActive(h)}>
            <div className="highlight-thumb-wrap">
              {h.thumbnail && (
                <img src={h.thumbnail} alt="" className="highlight-thumb" loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
              <span className="highlight-play">▶</span>
              {h.duration && <span className="highlight-duration">{h.duration.replace(/^00:/, "")}</span>}
            </div>
            <p className="highlight-headline">{h.headline}</p>
          </button>
        ))}
      </div>

      {/* 再生モーダル */}
      {active && (
        <div className="highlight-modal" onClick={() => setActive(null)}>
          <div className="highlight-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="highlight-modal-close" onClick={() => setActive(null)}>✕</button>
            <video src={active.videoUrl} controls autoPlay className="highlight-video" poster={active.thumbnail} />
            <p className="highlight-modal-title">{active.headline}</p>
            {active.description && <p className="highlight-modal-desc">{active.description}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// ── Play-by-Play（重要プレーのみ） ───────────────────────────────────────────
function PlayByPlay({ gamePk }) {
  const [plays, setPlays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getGamePlays(gamePk)
      .then((data) => { if (active) setPlays(data.plays); })
      .catch(() => { if (active) setPlays([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gamePk]);

  if (loading) return (
    <div className="pbp-list">
      {Array.from({ length: 8 }, (_, i) => <SkeletonPlayRow key={i} />)}
    </div>
  );
  if (plays.length === 0) {
    return (
      <div className="home-empty-state">
        <span className="empty-state-icon">
          <img src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg" alt="" width={36} height={36} style={{ opacity: 0.5 }} />
        </span>
        <p className="empty-state-title">No plays yet</p>
        <p className="empty-state-desc">Key plays appear once the game is underway.</p>
      </div>
    );
  }

  return (
    <div className="pbp-list">
      {plays.map((p, i) => (
        <div
          key={i}
          className={`pbp-row${p.isScoringPlay ? " pbp-row--scoring" : ""}`}
        >
          <div className="pbp-inning">
            <span className="pbp-half">{p.halfInning === "top" ? "▲" : "▼"}</span>
            <span>{p.inning}</span>
          </div>
          <div className="pbp-detail">
            <p className="pbp-desc">{p.description}</p>
            {p.isScoringPlay && (
              <span className="pbp-score">{p.awayScore} - {p.homeScore}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Line Score（イニング表） ─────────────────────────────────────────────────
function LineScore({ away, home, innings }) {
  if (innings.length === 0) {
    return (
      <div className="home-empty-state">
        <span className="empty-state-icon"><img src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg" alt="" width={36} height={36} style={{ opacity: 0.5 }} /></span>
        <p className="empty-state-title">No line score yet</p>
        <p className="empty-state-desc">This game has not started.</p>
      </div>
    );
  }

  const renderRow = (team, side) => (
    <div className="linescore-row">
      <Link to={`/team/${team.teamId}`} className="linescore-team">
        <img
          src={`https://www.mlbstatic.com/team-logos/${team.teamId}.svg`}
          alt={team.teamName}
          className="linescore-team-logo"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <span className="linescore-team-name">{team.teamName}</span>
      </Link>
      {innings.map((inn) => (
        <span key={inn.num} className="linescore-cell">
          {inn[side] ?? "-"}
        </span>
      ))}
      <span className="linescore-cell linescore-total">{team.runs ?? "-"}</span>
      <span className="linescore-cell linescore-total">{team.hits ?? "-"}</span>
      <span className="linescore-cell linescore-total">{team.errors ?? "-"}</span>
    </div>
  );

  return (
    <div className="linescore-wrap">
      <div className="linescore-table" style={{ "--inning-count": innings.length }}>
        <div className="linescore-row linescore-row--head">
          <span className="linescore-team linescore-head-team">Team</span>
          {innings.map((inn) => (
            <span key={inn.num} className="linescore-cell">{inn.num}</span>
          ))}
          <span className="linescore-cell linescore-total">R</span>
          <span className="linescore-cell linescore-total">H</span>
          <span className="linescore-cell linescore-total">E</span>
        </div>
        {renderRow(away, "away")}
        {renderRow(home, "home")}
      </div>
    </div>
  );
}

// ── Box Score テーブル ───────────────────────────────────────────────────────
function BattingTable({ batters }) {
  return (
    <div className="box-table-wrap">
      <h3 className="box-table-title">Batting</h3>
      <table className="box-table">
        <thead>
          <tr>
            <th className="box-name-col">Batter</th>
            <th>AB</th><th>R</th><th>H</th><th>HR</th><th>RBI</th><th>BB</th><th>K</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b, i) => (
            <tr key={i}>
              <td className="box-name-col">
                <span className="box-player-name">{b.name}</span>
                <span className="box-player-pos">{b.position}</span>
              </td>
              <td>{b.ab}</td><td>{b.r}</td><td>{b.h}</td><td>{b.hr}</td>
              <td>{b.rbi}</td><td>{b.bb}</td><td>{b.k}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitchingTable({ pitchers }) {
  return (
    <div className="box-table-wrap">
      <h3 className="box-table-title">Pitching</h3>
      <table className="box-table">
        <thead>
          <tr>
            <th className="box-name-col">Pitcher</th>
            <th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, i) => (
            <tr key={i}>
              <td className="box-name-col">
                <span className="box-player-name">{p.name}</span>
              </td>
              <td>{p.ip}</td><td>{p.h}</td><td>{p.r}</td>
              <td>{p.er}</td><td>{p.bb}</td><td>{p.k}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────────────────────
function GamePage() {
  const { gamePk } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTeam, setActiveTeam] = useState("away");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchGame = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getGame(gamePk);
        if (active) setGame(data);
      } catch {
        if (active) setError("Failed to load game.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchGame();
    return () => {
      active = false;
    };
  }, [gamePk, retryKey]);

  if (loading) return <SkeletonGamePage />;
  if (error) return <ErrorCard message={error} onRetry={() => setRetryKey((k) => k + 1)} />;
  if (!game) return null;

  const isLive = game.abstractState === "Live";
  // 日付・開始時刻はすべて日本時間（JST）で表示する
  const dateLabel = formatGameDate(game.gameDate);
  const timeLabel = formatGameTime(game.gameDate);
  const box = game.boxscore[activeTeam];
  const activeMeta = game[activeTeam];
  return (
    <div className="app-screen">
      <PageHeader
        backTo="/league"
        backLabel="League"
        kicker={`${isLive ? "● LIVE" : game.status} · ${dateLabel} · ${timeLabel} JST`}
        title={`${game.away.teamName} @ ${game.home.teamName}`}
        subtitle={game.venue || undefined}
      />

      <div className="screen-body px-6 py-6 w-full">
        {/* スコア（旧ヒーローから本文へ移動） */}
        <div className="game-score-line">
          {[game.away, game.home].map((team, i) => (
            <div
              key={i}
              className={`game-score-team${team.isWinner ? " game-score-team--winner" : ""}`}
            >
              <Link to={`/team/${team.teamId}`} className="game-score-team-link">
                <img
                  src={`https://www.mlbstatic.com/team-logos/${team.teamId}.svg`}
                  alt={team.teamName}
                  className="game-score-logo"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <span className="game-score-name">{team.teamName}</span>
              </Link>
              <span className="game-score-runs">{team.runs ?? "-"}</span>
            </div>
          ))}
        </div>

        {/* Line Score */}
        <section className="home-player-section">
          <div className="section-heading-row">
            <div className="section-heading">
              <h2>Line Score</h2>
            </div>
          </div>
          <LineScore away={game.away} home={game.home} innings={game.innings} />
        </section>

        {/* Highlights（開始済みの試合のみ） */}
        {game.abstractState !== "Preview" && (
          <section className="home-player-section">
            <div className="section-heading-row">
              <div className="section-heading">
                <h2>Highlights</h2>
                <p>Condensed game and key plays</p>
              </div>
            </div>
            <GameHighlights gamePk={game.gamePk} />
          </section>
        )}

        {/* Box Score（チーム切替） */}
        <section className="home-player-section">
          <div className="section-heading-row">
            <div className="section-heading">
              <h2>Box Score</h2>
            </div>
          </div>

          <div className="stats-tabs">
            {["away", "home"].map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setActiveTeam(side)}
                className={`stats-tab ${activeTeam === side ? "stats-tab--active" : ""}`}
              >
                <span className="stats-tab-label">{game[side].teamName}</span>
              </button>
            ))}
          </div>

          {box.batters.length === 0 && box.pitchers.length === 0 ? (
            <div className="home-empty-state">
              <span className="empty-state-icon"><img src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg" alt="" width={36} height={36} style={{ opacity: 0.5 }} /></span>
              <p className="empty-state-title">No box score yet</p>
              <p className="empty-state-desc">
                Stats for {activeMeta.teamName} are not available yet.
              </p>
            </div>
          ) : (
            <>
              <BattingTable batters={box.batters} />
              <PitchingTable pitchers={box.pitchers} />
            </>
          )}
        </section>

        {/* Play-by-Play（開始済みの試合のみ） */}
        {game.abstractState !== "Preview" && (
          <section className="home-player-section">
            <div className="section-heading-row">
              <div className="section-heading">
                <h2>Play-by-Play</h2>
                <p>Scoring plays and key moments</p>
              </div>
            </div>
            <PlayByPlay gamePk={game.gamePk} />
          </section>
        )}
      </div>
    </div>
  );
}

export default GamePage;
