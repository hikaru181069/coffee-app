import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";
import { getAuthToken } from "../utils/authStorage";
import {
  deleteFavorite,
  getFavorites,
  updateFavorite,
} from "../services/api/favoriteApi";
import { mlbTeams } from "../services/mlbTeams";
import { useToast } from "../contexts/ToastContext";

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_160,q_auto:best/v1/people/${id}/headshot/67/current`;

function FavoriteEditPage() {
  const { favoriteId } = useParams();
  const navigate = useNavigate();
  const token = getAuthToken();
  const { addToast } = useToast();

  const [favorite, setFavorite] = useState(null);
  const [formData, setFormData] = useState({ note: "", favoriteReason: "", tags: "" });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchFavorite = async () => {
      try {
        setLoading(true);
        const data = await getFavorites(token);
        const found = data.find((f) => f._id === favoriteId);
        if (!found) {
          setErrorMessage("Favorite not found.");
          return;
        }
        setFavorite(found);
        setFormData({
          note: found.note || "",
          favoriteReason: found.favoriteReason || "",
          tags: (found.tags || []).join(", "),
        });
      } catch (error) {
        console.error("Fetch favorite error:", error);
        setErrorMessage("Failed to load favorite.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchFavorite();
  }, [favoriteId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setErrorMessage("");
      const updated = await updateFavorite(favoriteId, {
        note: formData.note,
        favoriteReason: formData.favoriteReason,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }, token);
      setFavorite(updated);
      addToast("Memo saved!", "success");
    } catch (error) {
      console.error("Update favorite error:", error);
      addToast(error.message || "Failed to save.", "error");
    }
  };

  const handleDelete = async () => {
    // 楽観的更新: APIレスポンスを待たずに即座に画面遷移
    addToast(`${favorite.fullName} removed from favorites.`, "success");
    navigate("/favorites");

    try {
      await deleteFavorite(favoriteId, token);
    } catch (error) {
      // 失敗時: FavoritesPage再マウント時に再取得されるので自然に復元される
      console.error("Delete favorite error:", error);
      addToast(error.message || "Failed to delete.", "error");
    }
  };

  if (loading) {
    return (
      <div className="home-page px-6 py-12">
        <div className="player-detail mx-auto w-full max-w-3xl">
          <div className="skeleton-block" style={{ height: 20, width: 112, borderRadius: 4, marginBottom: 32 }} />
          <div style={{ display: "flex", gap: 24 }}>
            <div className="skeleton-block" style={{ width: 80, height: 104, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              <div className="skeleton-block" style={{ height: 28, width: "66%", borderRadius: 6 }} />
              <div className="skeleton-block" style={{ height: 14, width: "50%", borderRadius: 4 }} />
              <div className="skeleton-block" style={{ height: 14, width: "40%", borderRadius: 4 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage && !favorite) {
    return (
      <div className="app-screen">
        <div className="screen-body px-6 py-12">
          <ErrorCard message={errorMessage} />
          <div className="home-actions" style={{ marginTop: 16 }}>
            <Link className="home-link secondary" to="/favorites">← Back to Favorites</Link>
          </div>
        </div>
      </div>
    );
  }

  const teamEntry = mlbTeams.find(
    (t) => t.name.toLowerCase() === (favorite.teamName || "").toLowerCase(),
  );
  const h = favorite.hitterStats;
  const p = favorite.pitcherStats;
  const isHitter = favorite.playerType !== "pitcher";

  return (
    <div className="app-screen">
      <PageHeader
        backTo="/favorites"
        backLabel="Favorites"
        kicker="My Favorites"
        title={favorite.fullName}
        subtitle={[favorite.position, favorite.teamName].filter(Boolean).join(" · ")}
      />

      <div className="screen-body px-6 py-6 w-full">

        {/* 選手情報カード: ヘッドショット + 統計 + タグ + View Detail */}
        <div className="fedit-player-card">
          <div className="pcard-img-wrap" style={{ width: 68, height: 88, borderRadius: 10 }}>
            <img
              src={HEADSHOT(favorite.mlbPlayerId)}
              alt={favorite.fullName}
              className="pcard-img"
              onError={(e) => { e.currentTarget.classList.add("pcard-img--faded"); }}
            />
            {teamEntry && (
              <img
                src={`https://www.mlbstatic.com/team-logos/${teamEntry.id}.svg`}
                alt={favorite.teamName}
                className="pcard-team-badge"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </div>

          <div className="fedit-player-card-body">
            <div className="pcard-stats">
              {isHitter && h ? (
                <>
                  <span className="pcard-stat">
                    <span className="pcard-stat-val">{h.battingAverage ?? "—"}</span>
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
                    <span className="pcard-stat-val">{p.inningsPitched ?? "—"}</span>
                    <span className="pcard-stat-lbl">IP</span>
                  </span>
                </>
              ) : null}
            </div>

            {favorite.tags?.length > 0 && (
              <div className="pcard-tags">
                {favorite.tags.map((tag) => (
                  <span key={tag} className="pcard-tag">{tag}</span>
                ))}
              </div>
            )}

            <Link
              className="fedit-detail-link"
              to={`/players/${favorite.mlbPlayerId}`}
              state={{ from: `/favorites/${favoriteId}`, fromLabel: "Back to Edit" }}
            >
              View MLB Detail →
            </Link>
          </div>
        </div>

        {/* メモ編集フォーム */}
        <section className="detail-section">
          <h2>My Memo</h2>
          <form className="favorite-edit-form" onSubmit={handleSubmit}>
            <label>
              Note
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="Write a short note..."
              />
            </label>

            <label>
              Favorite Reason
              <textarea
                name="favoriteReason"
                value={formData.favoriteReason}
                onChange={handleChange}
                placeholder="Why do you like this player?"
              />
            </label>

            <label>
              Tags
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="power, two-way, favorite"
              />
            </label>

            <div className="favorite-form-actions">
              <button className="home-link" type="submit">Save Memo</button>
            </div>
          </form>
        </section>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {/* 削除セクション */}
        <div className="fedit-delete-section">
          {!confirmDelete ? (
            <button
              className="fedit-delete-btn"
              type="button"
              onClick={() => setConfirmDelete(true)}
            >
              Delete this favorite
            </button>
          ) : (
            <div className="fedit-delete-confirm">
              <p className="fedit-delete-message">
                Remove <strong>{favorite.fullName}</strong> from your favorites?
              </p>
              <div className="fedit-delete-actions">
                <button
                  className="home-link danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
                <button
                  className="home-link secondary"
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default FavoriteEditPage;
