// 1試合分のスコアカード（共有コンポーネント）
// League ページの Scores タブと Home の "Today's MLB" で共用する。
//
// props:
//   game = {
//     gamePk, status, abstractState (Preview/Live/Final),
//     away: { teamId, teamName, score, isWinner },
//     home: { teamId, teamName, score, isWinner },
//   }

import { Link } from "react-router-dom";

function ScoreCard({ game }) {
  const { away, home, status, abstractState, gamePk } = game;
  const isFinal = abstractState === "Final";
  const isLive = abstractState === "Live";
  // 開始済み（Live / Final）の試合だけ詳細ページへのリンクを出す
  const hasDetail = (isFinal || isLive) && gamePk;

  return (
    <div className="score-card">
      <div className="score-card-status">
        <span className={`score-status-badge${isLive ? " score-status-badge--live" : ""}`}>
          {isLive ? "● LIVE" : status}
        </span>
      </div>
      {[away, home].map((team, i) => {
        // 試合終了時、勝者をハイライト
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
      {hasDetail && (
        <Link to={`/game/${gamePk}`} className="score-boxscore-link">
          Box Score →
        </Link>
      )}
    </div>
  );
}

export default ScoreCard;
