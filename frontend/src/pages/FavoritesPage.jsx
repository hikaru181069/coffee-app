import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import FavoritePlayerCard from "../components/FavoritePlayerCard";
import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";
import { Lock, Star as StarIcon } from "lucide-react";
import SkeletonCard from "../components/SkeletonCard";
import { clearAuthData, getAuthToken } from "../utils/authStorage";
import { getFavorites } from "../services/api/favoriteApi";
import {
  getApiErrorMessage,
  isUnauthorizedError,
} from "../services/api/apiError";

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const token = getAuthToken();
  const navigate = useNavigate();

  const handleToggleSelect = (favorite) => {
    const id = favorite.mlbPlayerId;
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 2
        ? [...prev, id]
        : prev,
    );
  };

  const handleCompare = () => {
    if (selectedIds.length === 2) {
      navigate(`/compare?p1=${selectedIds[0]}&p2=${selectedIds[1]}`);
    }
  };

  const handleToggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setSelectedIds([]);
  };

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getFavorites(token);

        setFavorites(data);
      } catch (error) {
        console.error("Fetch favorites error:", error);
        if (isUnauthorizedError(error)) {
          clearAuthData();
          setErrorMessage("Your login session expired. Please login again.");
          return;
        }

        setFavorites([]);
        setErrorMessage(getApiErrorMessage(error, "Failed to load favorites."));
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [token]);

  return (
    <div className="app-screen">
      <PageHeader
        kicker="Your Collection"
        title="Favorites"
        subtitle="Manage your saved MLB players, notes, and tags."
        right={
          !loading && favorites.length > 0 ? (
            <span className="count-badge--favorites">{favorites.length}</span>
          ) : undefined
        }
      />

      <div className="screen-body px-6 py-6 w-full">
        {/* Compare モードのツールバー（旧ヒーローから本文へ移動） */}
        {!loading && favorites.length >= 2 && (
          <div className="home-actions mb-4">
            <button
              type="button"
              className={`home-link secondary${compareMode ? " home-link--active" : ""}`}
              onClick={handleToggleCompareMode}
            >
              {compareMode ? "Cancel Compare" : "Compare Players"}
            </button>
            {compareMode && selectedIds.length === 2 && (
              <button
                type="button"
                className="home-link"
                onClick={handleCompare}
              >
                Compare Selected →
              </button>
            )}
          </div>
        )}
        {compareMode && (
          <p className="compare-mode-hint">
            {selectedIds.length === 0 && "Select 2 players to compare."}
            {selectedIds.length === 1 && "Select 1 more player."}
            {selectedIds.length === 2 && "Ready! Click Compare Selected."}
          </p>
        )}
        {!token && (
          <div className="home-empty-state">
            <span className="empty-state-icon"><Lock size={36} strokeWidth={1.5} /></span>
            <p className="empty-state-title">Login required</p>
            <p className="empty-state-desc">Please login to view your favorites.</p>
            <Link className="home-link secondary" to="/login">Go to Login</Link>
          </div>
        )}

        {!loading && errorMessage && (
          <ErrorCard message={errorMessage} />
        )}

        {loading && (
          <div className="pcard-list">
            {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && token && !errorMessage && favorites.length === 0 && (
          <div className="home-empty-state">
            <span className="empty-state-icon"><StarIcon size={36} strokeWidth={1.5} /></span>
            <p className="empty-state-title">No favorites yet</p>
            <p className="empty-state-desc">
              Search for players and save them to your list.
            </p>
            <Link className="home-link secondary" to="/search">Search Players</Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="pcard-list">
            {favorites.map((favorite) => (
              <FavoritePlayerCard
                key={favorite._id}
                favorite={favorite}
                selectable={compareMode}
                selected={selectedIds.includes(favorite.mlbPlayerId)}
                onToggle={handleToggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FavoritesPage;
