import { Link } from "react-router-dom";

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_160,q_auto:best/v1/people/${id}/headshot/67/current`;

function ExternalPlayerCard({ player, alreadySaved, detailState }) {
  const detailPath = `/players/${player.mlbPlayerId}`;
  const h = player.hitterStats;
  const p = player.pitcherStats;
  const isHitter = player.playerType !== "pitcher";
  const reason = player.recommendationReasons?.[0];

  return (
    <article className="pcard">
      <div className="pcard-img-wrap">
        <img
          src={HEADSHOT(player.mlbPlayerId)}
          alt={player.name}
          className="pcard-img"
          onError={(e) => {
            e.currentTarget.classList.add("pcard-img--faded");
          }}
        />
        {player.teamId && (
          <img
            src={`https://www.mlbstatic.com/team-logos/${player.teamId}.svg`}
            alt={player.team}
            className="pcard-team-badge"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      <div className="pcard-body">
        <Link to={detailPath} state={detailState} className="pcard-name">
          {player.name}
        </Link>
        <div className="pcard-meta">
          {player.position && (
            <span className="pcard-pos">{player.position}</span>
          )}
          {player.team && <span className="pcard-team">{player.team}</span>}
        </div>
        <div className="pcard-stats">
          {isHitter && h ? (
            <>
              <span className="pcard-stat">
                <span className="pcard-stat-val">
                  {h.battingAverage ?? "—"}
                </span>
                <span className="pcard-stat-lbl">AVG</span>
              </span>
              <span className="pcard-stat">
                <span className="pcard-stat-val">{h.homeRuns ?? "—"}</span>
                <span className="pcard-stat-lbl">HR</span>
              </span>
              <span className="pcard-stat">
                <span className="pcard-stat-val">{h.rbis ?? "—"}</span>
                <span className="pcard-stat-lbl">RBI</span>
              </span>
            </>
          ) : p ? (
            <>
              <span className="pcard-stat">
                <span className="pcard-stat-val">{p.era ?? "—"}</span>
                <span className="pcard-stat-lbl">ERA</span>
              </span>
              <span className="pcard-stat">
                <span className="pcard-stat-val">{p.strikeouts ?? "—"}</span>
                <span className="pcard-stat-lbl">K</span>
              </span>
              <span className="pcard-stat">
                <span className="pcard-stat-val">
                  {p.inningsPitched ?? "—"}
                </span>
                <span className="pcard-stat-lbl">IP</span>
              </span>
            </>
          ) : null}
        </div>
        {reason && <p className="pcard-note">{reason}</p>}
      </div>

      <Link
        to={detailPath}
        state={detailState}
        className={`pcard-action${alreadySaved ? " pcard-action--saved" : ""}`}
      >
        {alreadySaved ? "Saved ✓" : "View →"}
      </Link>
    </article>
  );
}

export default ExternalPlayerCard;
