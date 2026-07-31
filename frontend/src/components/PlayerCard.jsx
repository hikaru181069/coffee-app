import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { mlbTeams } from "../services/mlbTeams";
import { getPlayerBios } from "../services/api/externalPlayerApi";
import { getTeamColor } from "../services/teamColors";
import styles from "./PlayerCard.module.css";

// 打者・投手で軸(何を棒グラフにするか)が異なる。
// 値は既存のアーキタイプ分類(backend/services/mlb/archetypeService.js)が
// 既に計算しているパーセンタイル(0-100)をそのまま流用する。新しい計算ロジックは不要。
const HITTER_BARS = [
  { key: "power", label: "Power" },
  { key: "speed", label: "Speed" },
  { key: "contact", label: "Contact" },
  { key: "defense", label: "Defense" },
];

const PITCHER_BARS = [
  { key: "dominance", label: "Dominance" },
  { key: "control", label: "Control" },
  { key: "durability", label: "Durability" },
];

function PlayerCard({ player }) {
  const playerId =
    player.playerId || player.mlbPlayerId || player._id;
  const name = player.fullName || player.name;
  const team = player.teamName || player.team;
  const position = player.position;
  const image = player.imageUrl || player.image;
  const isPitcher = player.playerType === "pitcher";
  const scores = player.styleScores;

  const teamId = player.teamId
    ?? mlbTeams.find((t) => t.name.toLowerCase() === (team || "").toLowerCase())?.id;
  const teamColor = getTeamColor(teamId);

  // 推薦理由のうち、全員に付く定型句は除き、特徴的な理由だけバッジ表示する
  const recReasons = (player.recommendationReasons || []).filter(
    (reason) => reason !== "Recommended from your favorite team",
  );

  const bars = isPitcher ? PITCHER_BARS : HITTER_BARS;

  // 出身校・ドラフト年・デビュー年などの紹介文(MLB Stats APIの構造化データから
  // 組み立て済み)を取得する。補助表示のため、失敗・データ無しでも他の表示は
  // 止めない(bioがnullのままなら行ごと表示しない)。
  const [bio, setBio] = useState(null);
  useEffect(() => {
    if (!playerId) return;
    let active = true;
    getPlayerBios([playerId]).then((bios) => {
      if (active) setBio(bios[playerId] ?? null);
    });
    return () => { active = false; };
  }, [playerId]);

  return (
    <Link
      className={`player-card ${styles.glassCard} transition duration-200 hover:-translate-y-1 hover:shadow-2xl`}
      to={`/players/${playerId}`}
      style={{ "--team-color": teamColor }}
    >
      <div className={styles.head}>
        {image && (
          <img className={styles.thumb} src={image} alt={name} />
        )}
        <div className={styles.headText}>
          <h2 className={styles.name}>{name}</h2>
          <div className={styles.teamRow}>
            {teamId && (
              <img
                src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
                alt={team}
                className={styles.teamLogo}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <span>{[position, team].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      </div>

      {bio && <p className={styles.bio}>{bio}</p>}
      {player.reason && <p className="external-note">{player.reason}</p>}
      {recReasons.length > 0 && (
        <div className="rec-reasons">
          {recReasons.slice(0, 2).map((reason) => (
            <span key={reason} className="rec-reason-badge">
              {reason}
            </span>
          ))}
        </div>
      )}

      {scores && (
        <div className={styles.bars}>
          {bars.map(({ key, label }) => {
            const value = scores[key];
            // null/undefined = そもそも評価に使えるデータが無い(例: 捕手のOAA)。
            // 0だと「最低評価」に見えてしまうため、行ごと非表示にする。
            if (value == null) return null;
            return (
              <div className={styles.barRow} key={key}>
                <span className={styles.barLabel}>{label}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${value}%` }} />
                </div>
                <span className={styles.barValue}>{value}</span>
              </div>
            );
          })}
        </div>
      )}
    </Link>
  );
}

export default PlayerCard;
