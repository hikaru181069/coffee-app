import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";

import PageHeader from "../components/PageHeader";
import PlayerCard from "../components/PlayerCard";
import SkeletonCard from "../components/SkeletonCard";
import { completeOnboarding } from "../services/api/userApi";
import { createFavoritesBulk } from "../services/api/favoriteApi";
import {
  getOnboardingPlayers,
  searchExternalPlayers,
  fetchPlayerSuggestions,
} from "../services/api/externalPlayerApi";
import { getAuthToken, markOnboardingCompleted } from "../utils/authStorage";

function OnboardingFavoritesPage() {
  const navigate = useNavigate();
  const token = getAuthToken();
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // 任意の選手を検索して選べるようにする(既存プールの20人に限定しない)。
  // SearchPage.jsxと同じ、候補ドロップダウン付きの検索パターンを再利用する。
  const [searchText, setSearchText] = useState("");
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    getOnboardingPlayers()
      .then(setPlayers)
      .catch((err) => setErrorMessage(err.message || "Failed to load players."))
      .finally(() => setLoading(false));
  }, [navigate, token]);

  // 候補検索(300msデバウンス)
  useEffect(() => {
    const text = suggestQuery.trim();
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return undefined;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchPlayerSuggestions(text);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [suggestQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = async (query) => {
    if (!query.trim() || query.trim().length < 2) return;
    setSearchLoading(true);
    setShowSuggestions(false);
    try {
      const results = await searchExternalPlayers(query.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    runSearch(searchText);
  };

  const handleSuggestionClick = (suggestion) => {
    clearTimeout(debounceRef.current);
    setSearchText(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    runSearch(suggestion.name);
  };

  const handleClearSearch = () => {
    clearTimeout(debounceRef.current);
    setSearchText("");
    setSuggestQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const handleTogglePlayer = (player) => {
    const alreadySelected = selectedPlayers.some(
      (p) => p.mlbPlayerId === player.mlbPlayerId,
    );
    setSelectedPlayers((prev) =>
      alreadySelected
        ? prev.filter((p) => p.mlbPlayerId !== player.mlbPlayerId)
        : [...prev, player],
    );
  };

  const handleComplete = async () => {
    if (selectedPlayers.length < 3) {
      setErrorMessage("Please choose at least 3 favorite players.");
      return;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      await createFavoritesBulk(selectedPlayers, token);
      await completeOnboarding(token);
      markOnboardingCompleted();
      navigate("/favorites");
    } catch (error) {
      console.error("Complete onboarding error:", error);
      setErrorMessage(error.message || "Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  const isReady = selectedPlayers.length >= 3;

  const renderSelectableGrid = (list) => (
    <div className="player-list">
      {list.map((player) => {
        const selected = selectedPlayers.some(
          (p) => p.mlbPlayerId === player.mlbPlayerId,
        );
        return (
          <div
            className={`selectable-player ${selected ? "selected" : ""}`}
            key={player.mlbPlayerId}
          >
            <PlayerCard player={player} />
            <button
              className={`home-link ${selected ? "" : "secondary"}`}
              type="button"
              onClick={() => handleTogglePlayer(player)}
            >
              {selected ? "✓ Selected" : "Select"}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="app-screen">
      <PageHeader
        kicker="Get Started"
        title="Pick Your Favorites"
        subtitle="Choose 3 or more players you like. We'll use them to find players with a similar playstyle."
        right={
          <div className="onboarding-count-row">
            <span className={`onboarding-count-badge ${isReady ? "onboarding-count-badge--ok" : ""}`}>
              {selectedPlayers.length} selected
            </span>
            <span className="onboarding-count-hint">
              {isReady
                ? "Ready! You can add more or continue."
                : `${3 - selectedPlayers.length} more needed`}
            </span>
          </div>
        }
      />

      <div className="screen-body px-6 py-6 w-full">
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {/* 任意の選手を検索して追加する */}
        <form onSubmit={handleSearchSubmit}>
          <div className="player-search-wrap" ref={wrapperRef}>
            <div className="player-search-input-row">
              <SearchIcon size={16} className="player-search-icon" />
              <input
                type="text"
                placeholder="Search for any player…"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setSuggestQuery(event.target.value);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onKeyDown={(e) => e.key === "Escape" && setShowSuggestions(false)}
                className="player-search-input"
              />
              {searchText && (
                <button type="button" className="player-search-clear" onClick={handleClearSearch}>
                  <X size={14} />
                </button>
              )}
            </div>

            {showSuggestions && (
              <ul className="scout-suggestions">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="scout-suggestion-item"
                      onMouseDown={() => handleSuggestionClick(s)}
                    >
                      <span className="scout-suggestion-name">{s.name}</span>
                      <span className="scout-suggestion-pos">
                        {s.position} {s.team}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        {searchLoading && (
          <div className="player-list">
            {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!searchLoading && searchResults.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-ctp-text mt-2 mb-3">Search Results</h2>
            {renderSelectableGrid(searchResults)}
          </>
        )}

        <h2 className="text-lg font-bold text-ctp-text mt-8 mb-3">Popular Players</h2>
        {loading
          ? (
            <div className="player-list">
              {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)}
            </div>
          )
          : renderSelectableGrid(players)}

        <div className="home-actions mt-8">
          <button
            className="home-link"
            type="button"
            disabled={loading || !isReady}
            onClick={handleComplete}
          >
            {loading ? "Saving…" : "Continue →"}
          </button>
          <Link className="home-link secondary" to="/">
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFavoritesPage;
