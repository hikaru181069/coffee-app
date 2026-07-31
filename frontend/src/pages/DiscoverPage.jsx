import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, X, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

import { getForYouRecommendations } from "../services/api/recommendationApi";
import { getOnboardingPlayers } from "../services/api/externalPlayerApi";
import { createFavorite } from "../services/api/favoriteApi";
import { recordDislike } from "../services/api/interactionApi";
import { getAuthToken } from "../utils/authStorage";
import { useToast } from "../contexts/ToastContext";

import styles from "./DiscoverPage.module.css";

// 設計方針: SpotifyのUX(発見) × Apple MusicのUI(洗練された没入感)。
//
// Spotifyの「発見」体験(Discover Weekly等)は、実はスワイプでLike/Dislikeを
// ジャッジする仕組みを使っていない。キュレーションされた列を眺め、気になった
// ものを再生する(このアプリなら「選手詳細を見る」)、という単純な操作だけで、
// 視聴履歴やお気に入り登録という自然な行動から好みを学習する設計になっている。
//
// 過去にTinder式のスワイプ・3Dカルーセルを試みたが、ドラッグ/wheelイベントの
// 実機挙動が安定せず全て破棄した。その反省を踏まえ、今回はジェスチャーを一切
// 使わず、ボタンだけで完結する「Now Playing」的な1枚送りの画面にする。
// 選手詳細への遷移は既存のuseRecentlyViewed(PlayerDetailPage側)がそのまま
// 「見た」という暗黙のシグナルを記録してくれるため、新しいバックエンドは不要。

const HEADSHOT_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_600,q_auto:best/v1/people/${id}/headshot/67/current`;

const playerKey = (p) => p?.playerId || p?.mlbPlayerId;

function DiscoverPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const token = getAuthToken();

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getForYouRecommendations(token)
      .catch(() => ({ groups: [], fallback: [] }))
      .then(async (data) => {
        let items = data?.groups?.length
          ? data.groups.flatMap((group) => group.matches)
          : (data?.fallback || []).map((p) => ({ ...p, reason: "Popular MLB player" }));

        // お気に入り・履歴がまだ無いユーザーには、人気選手で埋める
        if (items.length === 0) {
          const popular = await getOnboardingPlayers().catch(() => []);
          items = popular.map((p) => ({ ...p, reason: "Popular MLB player" }));
        }

        setQueue(items);
        setLoading(false);
      });
  }, [token]);

  const restart = () => setIndex(0);
  const goNext = () => setIndex((i) => Math.min(queue.length - 1, i + 1));
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const currentPlayer = queue[index];
  const atEnd = !loading && queue.length > 0 && index >= queue.length - 1;

  const handleFavorite = async () => {
    if (!currentPlayer) return;
    try {
      await createFavorite(currentPlayer, token);
      addToast(`${currentPlayer.name || currentPlayer.fullName} added to favorites!`, "success");
    } catch (error) {
      addToast(error.message || "Failed to add favorite.", "error");
    }
  };

  const handleDislike = () => {
    if (!currentPlayer) return;
    recordDislike(currentPlayer, token);
    goNext();
  };

  const handleViewProfile = () => {
    if (!currentPlayer) return;
    navigate(`/players/${playerKey(currentPlayer)}`, {
      state: { from: "/discover", fromLabel: "Back to Discover" },
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={`${styles.art} skeleton-block`} />
        </div>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <p className={styles.emptyTitle}>Nothing to discover yet</p>
          <p className={styles.emptyDesc}>Add a favorite player to get personalized picks.</p>
        </div>
      </div>
    );
  }

  const photo = currentPlayer.imageUrl || currentPlayer.image || HEADSHOT_URL(playerKey(currentPlayer));
  const name = currentPlayer.name || currentPlayer.fullName;
  const team = currentPlayer.teamName || currentPlayer.team;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <p className={styles.kicker}>
          Discover · {index + 1} of {queue.length}
        </p>

        <div className={styles.artWrap}>
          <img
            src={photo}
            alt={name}
            className={styles.art}
            onError={(e) => { e.currentTarget.style.opacity = "0.4"; }}
          />
        </div>

        <h1 className={styles.name}>{name}</h1>
        <p className={styles.meta}>
          {[currentPlayer.position, team].filter(Boolean).join(" · ")}
        </p>
        {currentPlayer.reason && <p className={styles.reason}>{currentPlayer.reason}</p>}

        <div className={styles.actions}>
          <div className={styles.primaryRow}>
            <button type="button" className={styles.favoriteBtn} onClick={handleFavorite}>
              <Star size={18} strokeWidth={2.5} />
              Add to Favorites
            </button>
            <button
              type="button"
              className={styles.dislikeBtn}
              onClick={handleDislike}
              aria-label="Not interested"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
          <button type="button" className={styles.profileBtn} onClick={handleViewProfile}>
            View Full Profile →
          </button>
        </div>

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={goPrev}
            disabled={index === 0}
            aria-label="Previous"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          {atEnd ? (
            <button type="button" className={styles.navBtn} onClick={restart} aria-label="Start over">
              <RotateCcw size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <button type="button" className={styles.navBtn} onClick={goNext} aria-label="Next">
              <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {atEnd && (
          <p className={styles.endNote}>That&apos;s everyone for today — check back later for more.</p>
        )}
      </div>
    </div>
  );
}

export default DiscoverPage;
