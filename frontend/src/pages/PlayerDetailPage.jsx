import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import PlayerStats from "../components/PlayerStats";
import PlayerCard from "../components/PlayerCard";
import PlayerYearByYear from "../components/PlayerYearByYear";
import ErrorCard from "../components/ErrorCard";
import { getAuthToken } from "../utils/authStorage";
import {
  createFavorite,
  getFavorites,
} from "../services/api/favoriteApi";
import { getExternalPlayerDetail, getPlayerBios } from "../services/api/externalPlayerApi";
import { recordView } from "../services/api/interactionApi";
import { getSimilarPlayers } from "../services/api/similarPlayerApi";
import { mlbTeams } from "../services/mlbTeams";
import { getArchetypeColor } from "../services/archetypeColors";
import { useReveal } from "../hooks/useReveal";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { useToast } from "../contexts/ToastContext";


function PlayerDetailPage() {
  const { playerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { addRecentlyViewed } = useRecentlyViewed();
  const [player, setPlayer] = useState(null);
  const [mlbSimilar, setMlbSimilar] = useState([]);
  const [youngSimilar, setYoungSimilar] = useState([]);
  const [targetArchetypes, setTargetArchetypes] = useState([]);
  const [targetStyleScores, setTargetStyleScores] = useState(null);
  const [similarUnavailable, setSimilarUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [favoriteRecord, setFavoriteRecord] = useState(null);
  const [statsRef, statsVisible] = useReveal();
  const [gamesRef, gamesVisible] = useReveal();
  const [similarRef, similarVisible] = useReveal();
  const [loading, setLoading] = useState(false);

  const token = getAuthToken();
  const backPath = location.state?.from || "/search";
  const backLabel = location.state?.fromLabel || "Back to Search";

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        setLoading(true);
        setFavoriteRecord(null);
        const token = getAuthToken();
        const favoritePlayers = await getFavorites(token);
        const isExternalPlayerId = /^\d+$/.test(playerId);

        if (isExternalPlayerId) {
          const externalPlayer = await getExternalPlayerDetail(playerId);
          const savedFavorite = favoritePlayers.find(
            (favorite) => favorite.mlbPlayerId === Number(playerId),
          );
          setPlayer(externalPlayer);
          setFavoriteRecord(savedFavorite || null);
          setErrorMessage("");
          getSimilarPlayers(playerId).then(({ mlbSimilar = [], youngSimilar = [], targetArchetypes = [], targetStyleScores = null, unavailable = false }) => { setMlbSimilar(mlbSimilar); setYoungSimilar(youngSimilar); setTargetArchetypes(targetArchetypes); setTargetStyleScores(targetStyleScores); setSimilarUnavailable(unavailable); });
          return;
        }

        const favoritePlayer = favoritePlayers.find(
          (favorite) => favorite._id === playerId,
        );

        if (!favoritePlayer) {
          throw new Error("Player not found.");
        }

        const externalPlayer = await getExternalPlayerDetail(
          favoritePlayer.mlbPlayerId,
        );
        setPlayer({ ...favoritePlayer, ...externalPlayer });
        setFavoriteRecord(favoritePlayer);
        setErrorMessage("");
        getSimilarPlayers(favoritePlayer.mlbPlayerId).then(({ mlbSimilar = [], youngSimilar = [], targetArchetypes = [], targetStyleScores = null, unavailable = false }) => { setMlbSimilar(mlbSimilar); setYoungSimilar(youngSimilar); setTargetArchetypes(targetArchetypes); setTargetStyleScores(targetStyleScores); setSimilarUnavailable(unavailable); });
      } catch (error) {
        console.error("Fetch player error:", error);
        setPlayer(null);
        setErrorMessage(error.message || "Failed to load player.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [playerId, retryKey]);

  // 選手詳細の閲覧履歴をホーム画面の「最近見た選手」用にlocalStorageへ記録する
  useEffect(() => {
    if (!player?.mlbPlayerId) return;
    addRecentlyViewed({
      playerId: player.mlbPlayerId,
      fullName: player.fullName || player.name,
      teamName: player.team && player.team !== "Unknown" ? player.team : player.teamName,
      position: player.position,
      imageUrl: player.imageUrl || player.image,
    });
  }, [player, addRecentlyViewed]);

  // 閲覧行動をサーバー側にも記録する(推薦ロジックの「好みプロファイル」の元データ)
  useEffect(() => {
    if (!player?.mlbPlayerId || !token) return;
    recordView(player, token);
  }, [player, token]);

  // 出身校・ドラフト年・デビュー年などの紹介文。補助表示のため取得失敗は無視する。
  const [bio, setBio] = useState(null);
  useEffect(() => {
    if (!player?.mlbPlayerId) return;
    let active = true;
    getPlayerBios([player.mlbPlayerId]).then((bios) => {
      if (active) setBio(bios[player.mlbPlayerId] ?? null);
    });
    return () => { active = false; };
  }, [player?.mlbPlayerId]);

  const handleAddToFavorites = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (favoriteRecord) {
      addToast("Already in your favorites.", "info");
      return;
    }

    // 楽観的更新: APIレスポンスを待たずに即座にUI反映
    setFavoriteRecord({ _id: "temp", mlbPlayerId: player?.mlbPlayerId });

    try {
      const favorite = await createFavorite(player, token);
      setFavoriteRecord(favorite);
      addToast("Added to favorites!", "success");
    } catch (error) {
      // 失敗時はロールバック
      setFavoriteRecord(null);
      console.error("Add favorite error:", error);
      addToast(error.message || "Failed to add favorite.", "error");
    }
  };

  if (loading) {
    return (
      <div className="home-page px-6 py-12">
        <div className="player-detail mx-auto w-full max-w-4xl">
          <div className="detail-hero">
            <div className="skeleton-block" style={{ width: "min(100%, 360px)", height: 480, borderRadius: "10%", flexShrink: 0 }} />
            <div className="detail-hero-copy">
              <div className="skeleton-block" style={{ height: 36, width: "66%", borderRadius: 6, alignSelf: "center" }} />
              <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div className="skeleton-block" style={{ height: 12, width: 56, borderRadius: 4 }} />
                    <div className="skeleton-block" style={{ height: 20, width: 80, borderRadius: 4 }} />
                  </div>
                ))}
              </div>
              <div className="skeleton-block" style={{ height: 44, width: 176, borderRadius: 999, alignSelf: "center" }} />
            </div>
          </div>

          <div className="detail-stats-grid">
            {[0, 1].map((i) => (
              <div key={i} className="detail-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="skeleton-block" style={{ height: 20, width: 160, borderRadius: 4 }} />
                {[0, 1, 2].map((j) => (
                  <div key={j} className="skeleton-block" style={{ height: 16, width: "100%", borderRadius: 4 }} />
                ))}
              </div>
            ))}
          </div>

          <div className="detail-section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="skeleton-block" style={{ height: 20, width: 128, borderRadius: 4 }} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-block" style={{ height: 16, width: "100%", borderRadius: 4 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="home-page px-6 py-12">
        <ErrorCard
          message={errorMessage}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
        <div className="home-actions" style={{ marginTop: 16 }}>
          <Link className="home-link secondary" to="/">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!player) {
    return null;
  }

  const currentSeasonStats = {
    playerType: player.playerType,
    hitterStats: player.currentSeasonStats?.hitterStats || player.hitterStats,
    pitcherStats:
      player.currentSeasonStats?.pitcherStats || player.pitcherStats,
  };
  const recentGames = player.recentGames || [];
  const displayName = player.fullName || player.name;
  const displayTeam =
    player.team && player.team !== "Unknown" ? player.team : player.teamName;
  const displayImage = player.imageUrl || player.image;
  const displayTeamId =
    player.teamId ??
    mlbTeams.find((t) => t.name.toLowerCase() === (displayTeam || "").toLowerCase())?.id;

  return (
    <div className="home-page px-6 py-12">
      <div className="detail-actions">
        <Link className="detail-nav-link" to={backPath}>
          ← {backLabel}
        </Link>
      </div>

      <div className="player-detail mx-auto mt-8 w-full max-w-4xl">
        <section className="detail-hero">
          {displayImage && (
            <div className="player-image-wrapper detail-hero-image transition duration-200 hover:scale-[1.02]">
              <img
                className="player-image"
                src={displayImage}
                alt={displayName}
              />
            </div>
          )}

          <div className="detail-hero-copy">
            {player.source && player.source !== "Manual" && (
              <p className="source-badge">{player.source}</p>
            )}
            <div className="archetype-badge-row">
              {targetArchetypes.length > 0
                ? targetArchetypes.map((arch) => (
                    <Link
                      key={arch}
                      to={`/archetype/${arch.toLowerCase().replace(/\s+/g, "-")}`}
                      className="archetype-badge"
                      style={{ background: getArchetypeColor(arch), color: "var(--ctp-base)" }}
                    >
                      {arch}
                    </Link>
                  ))
                : targetStyleScores && (() => {
                    const isP = player?.playerType === "pitcher" || player?.position === "P";
                    const defs = isP
                      ? [
                          { key: "dominance",  label: "Dominance",  color: "var(--ctp-mauve)"    },
                          { key: "control",    label: "Control",    color: "var(--ctp-sapphire)" },
                          { key: "durability", label: "Durability", color: "var(--ctp-peach)"    },
                        ]
                      : [
                          { key: "power",   label: "Power",   color: "var(--ctp-red)"   },
                          { key: "speed",   label: "Speed",   color: "var(--ctp-teal)"  },
                          { key: "contact", label: "Contact", color: "var(--ctp-green)" },
                          { key: "defense", label: "Defense", color: "var(--ctp-blue)"  },
                        ];
                    return defs
                      .map((d) => ({ ...d, score: targetStyleScores[d.key] ?? 0 }))
                      .sort((a, b) => b.score - a.score)
                      .map(({ key, label, color }) => (
                        <span key={key} className="archetype-badge" style={{ background: color, color: "var(--ctp-base)" }}>
                          {label}
                        </span>
                      ));
                  })()
              }
            </div>
            <h1>{displayName}</h1>
            <button
              className={`home-link${favoriteRecord ? " secondary" : ""}`}
              style={{ marginTop: 4, justifySelf: "center" }}
              type="button"
              disabled={Boolean(favoriteRecord)}
              onClick={handleAddToFavorites}
            >
              {favoriteRecord ? "✓ Already in Favorites" : "★ Add to Favorites"}
            </button>
            <dl className="detail-meta-list">
              <div>
                <dt>Team</dt>
                <dd className="flex items-center gap-2">
                  {displayTeamId && (
                    <img
                      src={`https://www.mlbstatic.com/team-logos/${displayTeamId}.svg`}
                      alt={displayTeam}
                      style={{ width: "20px", height: "20px" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  {displayTeam || "Unknown"}
                </dd>
              </div>
              <div>
                <dt>Position</dt>
                <dd>{player.position || "Unknown"}</dd>
              </div>
              {player.height && (
                <div>
                  <dt>Height</dt>
                  <dd>{player.height}</dd>
                </div>
              )}
              {player.weight && (
                <div>
                  <dt>Weight</dt>
                  <dd>{player.weight} lbs</dd>
                </div>
              )}
            </dl>
            {bio && <p className="detail-bio">{bio}</p>}
          </div>
        </section>

        {(player.note || player.favoriteReason) && (
          <section className="detail-section favorite-note-section">
            <h2>My Favorite Memo</h2>
            {player.note && (
              <p>
                <strong>Note:</strong> {player.note}
              </p>
            )}
            {player.favoriteReason && (
              <p>
                <strong>Reason:</strong> {player.favoriteReason}
              </p>
            )}
          </section>
        )}

        <section ref={statsRef} className={`detail-section reveal${statsVisible ? " visible" : ""}`}>
          <h2>Current Season Stats</h2>
          <PlayerStats player={currentSeasonStats} />
        </section>

        <section ref={gamesRef} className={`detail-section reveal reveal-delay-1${gamesVisible ? " visible" : ""}`}>
          <h2>Last 5 Games</h2>
          {recentGames.length > 0 ? (
            <div className="recent-games-table-wrap">
              <table className="recent-games-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Result</th>
                    <th>Line</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGames.map((game) => (
                    <tr key={`${game.date}-${game.opponent}`}>
                      <td>{game.date}</td>
                      <td>vs {game.opponent}</td>
                      <td>
                        <span className={`game-result-badge game-result-badge--${game.result === "W" ? "win" : "loss"}`}>
                          {game.result}
                        </span>
                      </td>
                      <td>{game.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="detail-coming-soon">
              <img
                src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg"
                alt=""
                width={28}
                height={28}
                style={{ opacity: 0.5 }}
              />
              <p>No recent games available for this player.</p>
            </div>
          )}
        </section>

        {/* 年度別成績（データがあれば表示） */}
        {player.mlbPlayerId && (
          <section className="detail-section">
            <h2>Year-by-Year</h2>
            <PlayerYearByYear
              playerId={player.mlbPlayerId}
              playerType={player.playerType}
            />
          </section>
        )}

        <div className="home-actions">
          <button
            className={`home-link${favoriteRecord ? " secondary" : ""}`}
            type="button"
            disabled={Boolean(favoriteRecord)}
            onClick={handleAddToFavorites}
          >
            {favoriteRecord ? "✓ Already in Favorites" : "Add to Favorites"}
          </button>

          <Link
            className="home-link secondary"
            to={`/scout/${player.mlbPlayerId}`}
          >
            Scouting Report →
          </Link>

          <Link
            className="home-link secondary"
            to={`/compare?p1=${player.mlbPlayerId}`}
          >
            Compare →
          </Link>

          {/* Matchup 導線:
              投手 → /matchup?pitcher=id (打者を選んで対戦成績を見る)
              打者 → /matchup?batter=id  (投手を選んで対戦成績を見る) */}
          <Link
            className="home-link secondary"
            to={
              player.playerType === "pitcher"
                ? `/matchup?pitcher=${player.mlbPlayerId}`
                : `/matchup?batter=${player.mlbPlayerId}`
            }
          >
            Matchup →
          </Link>

          {player.baseballSavantUrl && (
            <a
              className="home-link secondary"
              href={player.baseballSavantUrl}
              target="_blank"
              rel="noreferrer"
            >
              Baseball Savant ↗
            </a>
          )}
        </div>

      </div>

      <section ref={similarRef} className={`similar-players reveal${similarVisible ? " visible" : ""}`}>

        {/* MLB 全体から似たスタイルの選手 */}
        <div className="section-heading">
          <h2>Players with Similar Style</h2>
          <p className="section-heading-desc">
            {player.playerType === "pitcher"
              ? "MLB pitchers with a similar pitching profile."
              : "MLB players with a similar batting profile."}
          </p>
        </div>
        {mlbSimilar.length > 0 ? (
          <div className="player-list">
            {mlbSimilar.map((p) => (
              <PlayerCard key={p.mlbPlayerId} player={p} />
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <span className="empty-state-icon"><img src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg" alt="" width={36} height={36} style={{ opacity: 0.5 }} /></span>
            {similarUnavailable ? (
              <>
                <p className="empty-state-title">Similar players unavailable right now</p>
                <p className="empty-state-desc">The recommendation engine is warming up or temporarily unreachable. Please try again in a moment.</p>
              </>
            ) : (
              <p className="empty-state-title">No Similar Players Found</p>
            )}
          </div>
        )}

        {/* 25歳以下の若手から似たスタイルの選手 */}
        {youngSimilar.length > 0 && (
          <>
            <div className="section-heading" style={{ marginTop: "2rem" }}>
              <h2>Rising Stars with Similar Style</h2>
              <p className="section-heading-desc">Players age 25 and under who share this playing style.</p>
            </div>
            <div className="player-list">
              {youngSimilar.map((p) => (
                <PlayerCard key={p.mlbPlayerId} player={p} />
              ))}
            </div>
          </>
        )}

      </section>
    </div>
  );
}

export default PlayerDetailPage;
