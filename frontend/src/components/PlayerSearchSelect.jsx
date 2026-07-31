import { useEffect, useRef, useState } from "react";
import { fetchPlayerSuggestions } from "../services/api/externalPlayerApi";
import { getExternalPlayerDetail } from "../services/api/externalPlayerApi";

function PlayerSearchSelect({ label, player, onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await fetchPlayerSuggestions(value.trim());
      setSuggestions(results.slice(0, 8));
      setLoading(false);
    }, 300);
  };

  const handleSelect = async (suggestion) => {
    setSuggestions([]);
    setQuery(suggestion.fullName || suggestion.name || "");
    setFetching(true);
    try {
      const detail = await getExternalPlayerDetail(
        suggestion.id || suggestion.playerId || suggestion.externalId,
      );
      onSelect(detail);
    } catch {
      onSelect(null);
    } finally {
      setFetching(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    onSelect(null);
  };

  return (
    <div className="compare-search-slot" ref={wrapperRef}>
      <p className="compare-slot-label">{label}</p>
      {player ? (
        <div className="compare-selected-player">
          <p className="compare-selected-name">{player.name || player.fullName}</p>
          <p className="compare-selected-team">{player.team} · {player.position}</p>
          <button
            type="button"
            className="compare-clear-btn"
            onClick={handleClear}
          >
            Change
          </button>
        </div>
      ) : (
        <div className="compare-search-input-wrap">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search player name…"
            className="compare-search-input"
            disabled={fetching}
          />
          {fetching && <p className="compare-fetching">Loading…</p>}
          {loading && !fetching && (
            <p className="compare-fetching">Searching…</p>
          )}
          {suggestions.length > 0 && (
            <ul className="compare-suggestions">
              {suggestions.map((s) => (
                <li key={s.id || s.playerId}>
                  <button
                    type="button"
                    className="compare-suggestion-item"
                    onClick={() => handleSelect(s)}
                  >
                    <span className="compare-suggestion-name">
                      {s.fullName || s.name}
                    </span>
                    {s.position && (
                      <span className="compare-suggestion-pos">{s.position}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerSearchSelect;
