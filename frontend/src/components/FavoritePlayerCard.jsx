import { Link } from "react-router-dom";
import { mlbTeams } from "../services/mlbTeams";

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_160,q_auto:best/v1/people/${id}/headshot/67/current`;

function FavoritePlayerCard({
  favorite,
  selectable = false,
  selected = false,
  onToggle,
}) {
  const h = favorite.hitterStats;
  const p = favorite.pitcherStats;
  const editPath = `/favorites/${favorite._id}`;
  const isHitter = favorite.playerType !== "pitcher";
  const teamEntry = mlbTeams.find(
    (t) => t.name.toLowerCase() === (favorite.teamName || "").toLowerCase(),
  );

  const handleClick = (e) => {
    if (selectable) {
      e.preventDefault();
      onToggle?.(favorite);
    }
  };

  return (
    <article
      className={`pcard${selected ? " pcard--selected" : ""}`}
      onClick={handleClick}
      style={selectable ? { cursor: "pointer" } : undefined}
    >
      {/* コンペアモード: チェックボックス */}
      {selectable && (
        <div className={`pcard-check${selected ? " pcard-check--active" : ""}`}>
          {selected && "✓"}
        </div>
      )}

      {/* ヘッドショット + チームロゴバッジ */}
      <div className="pcard-img-wrap">
        <img
          src={HEADSHOT(favorite.mlbPlayerId)}
          alt={favorite.fullName}
          className="pcard-img"
          onError={(e) => {
            e.currentTarget.classList.add("pcard-img--faded");
          }}
        />
        {teamEntry && (
          <img
            src={`https://www.mlbstatic.com/team-logos/${teamEntry.id}.svg`}
            alt={favorite.teamName}
            className="pcard-team-badge"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      {/* 選手情報 */}
      <div className="pcard-body">
        <Link
          to={selectable ? "#" : editPath}
          className="pcard-name"
          tabIndex={selectable ? -1 : 0}
          onClick={(e) => selectable && e.preventDefault()}
        >
          {favorite.fullName}
        </Link>

        <div className="pcard-meta">
          {favorite.position && (
            <span className="pcard-pos">{favorite.position}</span>
          )}
          {favorite.teamName && (
            <span className="pcard-team">{favorite.teamName}</span>
          )}
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

        {favorite.tags?.length > 0 && (
          <div className="pcard-tags">
            {favorite.tags.map((tag) => (
              <span key={tag} className="pcard-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {favorite.note && <p className="pcard-note">{favorite.note}</p>}
      </div>

      {/* アクションボタン（コンペアモード以外） */}
      {!selectable && (
        <Link to={editPath} className="pcard-action">
          Edit →
        </Link>
      )}
    </article>
  );
}

export default FavoritePlayerCard;
