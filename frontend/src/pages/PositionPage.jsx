import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { getPlayersByPosition } from "../services/api/positionApi";

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const POSITION_LABELS = {
  C:  "Catcher",           "1B": "First Base",
  "2B": "Second Base",     "3B": "Third Base",
  SS: "Shortstop",         LF:   "Left Field",
  CF: "Center Field",      RF:   "Right Field",
  DH: "Designated Hitter", SP:   "Starting Pitcher",
  RP: "Relief Pitcher",
};

const SORT_OPTIONS = {
  hitter:  [
    { key: "ops",     label: "OPS"  },
    { key: "homeRuns",label: "HR"   },
    { key: "stolenBases", label: "SB" },
    { key: "battingAverage", label: "AVG" },
  ],
  pitcher: [
    { key: "era",       label: "ERA" },
    { key: "strikeouts",label: "K"   },
    { key: "wins",      label: "W"   },
    { key: "whip",      label: "WHIP"},
  ],
};

const PITCHER_POSITIONS = new Set(["SP", "RP", "P"]);

// 表示する主要スタット 1 つ
function KeyStat({ player }) {
  if (player.playerType === "pitcher") {
    const s = player.pitcherStats;
    return (
      <div className="pos-player-stats">
        <span className="pos-stat"><span className="pos-stat-val">{s?.era?.toFixed(2) ?? "-"}</span><span className="pos-stat-key">ERA</span></span>
        <span className="pos-stat"><span className="pos-stat-val">{s?.strikeouts ?? "-"}</span><span className="pos-stat-key">K</span></span>
        <span className="pos-stat"><span className="pos-stat-val">{s?.wins ?? "-"}</span><span className="pos-stat-key">W</span></span>
      </div>
    );
  }
  const s = player.hitterStats;
  return (
    <div className="pos-player-stats">
      <span className="pos-stat"><span className="pos-stat-val">{s?.ops?.toFixed(3) ?? "-"}</span><span className="pos-stat-key">OPS</span></span>
      <span className="pos-stat"><span className="pos-stat-val">{s?.homeRuns ?? "-"}</span><span className="pos-stat-key">HR</span></span>
      <span className="pos-stat"><span className="pos-stat-val">{s?.rbis ?? "-"}</span><span className="pos-stat-key">RBI</span></span>
    </div>
  );
}

function PlayerRow({ player, rank }) {
  return (
    <Link to={`/players/${player.mlbPlayerId}`} className="pos-player-row">
      <span className="pos-player-rank">#{rank}</span>
      <img
        src={HEADSHOT(player.mlbPlayerId)}
        alt={player.fullName}
        className="pos-player-headshot"
        onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
      />
      <div className="pos-player-info">
        <span className="pos-player-name">{player.fullName}</span>
        <span className="pos-player-meta">
          {player.team}{player.age ? ` · Age ${player.age}` : ""}
        </span>
      </div>
      <KeyStat player={player} />
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="pos-player-list">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="pos-player-row pos-player-row--skeleton">
          <div className="skeleton-block" style={{ width: 28, height: 16 }} />
          <div className="skeleton-block pos-player-headshot" />
          <div className="pos-player-info">
            <div className="skeleton-block" style={{ width: 140, height: 14 }} />
            <div className="skeleton-block" style={{ width: 90, height: 12, marginTop: 4 }} />
          </div>
          <div className="pos-player-stats" style={{ gap: 16 }}>
            {[0, 1, 2].map((j) => (
              <div key={j} className="skeleton-block" style={{ width: 40, height: 28 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PositionPage() {
  const { pos } = useParams();
  const position = pos.toUpperCase();
  const isPitcher = PITCHER_POSITIONS.has(position);
  const sortOptions = isPitcher ? SORT_OPTIONS.pitcher : SORT_OPTIONS.hitter;

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [sortKey, setSortKey] = useState(sortOptions[0].key);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPlayersByPosition(position)
      .then((data) => setPlayers(data.players ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [position]);

  // ポジションが変わったらソートをリセット
  useEffect(() => {
    setSortKey(sortOptions[0].key);
  }, [position, sortOptions]);

  const sorted = [...players].sort((a, b) => {
    const statsA = isPitcher ? a.pitcherStats : a.hitterStats;
    const statsB = isPitcher ? b.pitcherStats : b.hitterStats;
    const va = statsA?.[sortKey] ?? 0;
    const vb = statsB?.[sortKey] ?? 0;
    // ERA は昇順、それ以外は降順
    return sortKey === "era" ? va - vb : vb - va;
  });

  const label = POSITION_LABELS[position] ?? position;

  return (
    <div className="app-screen">
      <PageHeader
        title={label}
        subtitle={`${position} — Statistical leaders`}
        kicker={!loading ? `${players.length} players` : ""}
        backTo="/positions"
        backLabel="Positions"
      />

      <div className="screen-body px-6 py-4 w-full">
        {/* ソートバー */}
        <div className="pos-sort-bar">
          <span className="pos-sort-label">Sort by</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              className={`pos-sort-btn${sortKey === opt.key ? " active" : ""}`}
              onClick={() => setSortKey(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading && <Skeleton />}

        {error && (
          <div className="home-empty-state" style={{ marginTop: 24 }}>
            <p className="empty-state-title">Failed to load</p>
            <p className="empty-state-desc">{error}</p>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="home-empty-state" style={{ marginTop: 24 }}>
            <p className="empty-state-title">No players found for {position}</p>
            <p className="empty-state-desc">Try another position</p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="pos-player-list">
            {sorted.map((player, i) => (
              <PlayerRow key={player.mlbPlayerId} player={player} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PositionPage;
