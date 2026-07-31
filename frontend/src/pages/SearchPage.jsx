import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ExternalPlayerCard from "../components/ExternalPlayerCard";
import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";
import { Search as SearchIcon, X } from "lucide-react";
import SkeletonCard from "../components/SkeletonCard";
import { getAuthToken } from "../utils/authStorage";
import { getFavorites } from "../services/api/favoriteApi";
import {
  searchExternalPlayers as fetchExternalPlayers,
  fetchPlayerSuggestions, // [Suggestions] 候補取得用の軽量API関数
} from "../services/api/externalPlayerApi";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const [searchText, setSearchText] = useState(keyword);
  // [Suggestions] 入力欄の表示値(searchText)とは別に、候補検索をトリガーする値を
  // 分離して持つ。候補選択時は searchText だけを更新して suggestQuery には触れない
  // ことで、選択直後に「選んだ選手名でもう一度候補検索が走り、自分自身が候補として
  // 再表示されてドロップダウンが閉じなくなる」問題を構造的に防ぐ。
  const [suggestQuery, setSuggestQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [savedPlayers, setSavedPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // [Suggestions] 候補リストと表示フラグ
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // [Suggestions] debounce用タイマーID / 外クリック検知用ラッパー要素
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const handleSearchExternalPlayers = async (nextSearchText) => {
    if (!nextSearchText.trim()) {
      setPlayers([]);
      setErrorMessage("Please enter a player name.");
      setHasSearched(false);
      return;
    }

    // MLB Stats API は1文字では結果を返さないため最低2文字必要
    if (nextSearchText.trim().length < 2) {
      setPlayers([]);
      setErrorMessage("Please enter at least 2 characters.");
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setShowSuggestions(false); // [Suggestions] 検索実行時にドロップダウンを閉じる

      const token = getAuthToken();
      const data = await fetchExternalPlayers(nextSearchText);
      const savedPlayersData = token ? await getFavorites(token) : [];

      setPlayers(data);
      setSavedPlayers(savedPlayersData);
      setHasSearched(true);
    } catch (error) {
      console.error("External player search error:", error);
      setPlayers([]);
      setErrorMessage(error.message || "Failed to search external players.");
    } finally {
      setLoading(false);
    }
  };

  // URLのkeywordが変わったら検索を実行（ブラウザ履歴・直リンク対応）
  useEffect(() => {
    if (keyword) {
      handleSearchExternalPlayers(keyword);
    }
  }, [keyword]);

  // [Suggestions] 入力中に300msのdebounceをかけて候補を取得する
  // debounce: キー入力のたびにAPIを叩かず、入力が止まってから発火させる仕組み
  // suggestQuery は実際のキー入力(onChange)でのみ更新されるため、候補選択による
  // searchText の変更ではこの effect は発火しない。
  useEffect(() => {
    const text = suggestQuery.trim();

    // 2文字未満は候補を出さない（APIが結果を返さないため）
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 前回のタイマーをキャンセルしてから新しいタイマーをセット
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await fetchPlayerSuggestions(text);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300); // 300ms待ってからAPI呼び出し

    // クリーンアップ: コンポーネントが再レンダリングされたらタイマーをキャンセル
    return () => clearTimeout(debounceRef.current);
  }, [suggestQuery]);

  // [Suggestions] フォームの外をクリックしたらドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      // wrapperRef の外側がクリックされたか判定
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    // クリーンアップ: コンポーネントがアンマウントされたらイベントリスナーを解除
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchText.trim()) {
      setSearchParams({ keyword: searchText.trim() });
    } else {
      handleSearchExternalPlayers(searchText);
    }
  };

  // [Suggestions] 候補をクリックしたら選手名をセットして即検索
  // suggestQuery には触れないため、候補検索effectはこの変更に反応しない
  const handleSuggestionClick = (suggestion) => {
    clearTimeout(debounceRef.current); // 保留中の候補取得タイマーも止める
    setSearchText(suggestion.name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchParams({ keyword: suggestion.name });
  };

  const handleClear = () => {
    clearTimeout(debounceRef.current);
    setSearchText("");
    setSuggestQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setPlayers([]);
    setErrorMessage("");
    setHasSearched(false);
    setSearchParams({});
  };

  const isAlreadySaved = (player) => {
    return savedPlayers.some((savedPlayer) => {
      if (savedPlayer.mlbPlayerId && player.mlbPlayerId) {
        return savedPlayer.mlbPlayerId === player.mlbPlayerId;
      }
      return savedPlayer.fullName.toLowerCase() === player.name.toLowerCase();
    });
  };

  return (
    <div className="app-screen">
      <PageHeader
        kicker="MLB Stats API"
        title="Search Players"
        subtitle="Search any MLB player by name from the official Stats API."
      />

      <div className="screen-body px-6 py-6 w-full">
        {/* 検索フォーム（旧ヒーローから本文へ移動）
            [Suggestions] wrapperRef は「フォーム外クリック」の検知範囲 */}
        <form onSubmit={handleSearch}>
          <div className="player-search-wrap" ref={wrapperRef}>
            <div className="player-search-input-row">
              <SearchIcon size={16} className="player-search-icon" />
              <input
                type="text"
                placeholder="e.g. Shohei Ohtani"
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setSuggestQuery(event.target.value);
                }}
                onFocus={() =>
                  suggestions.length > 0 && setShowSuggestions(true)
                }
                onKeyDown={(e) =>
                  e.key === "Escape" && setShowSuggestions(false)
                }
                className="player-search-input"
                autoFocus
              />
              {searchText && (
                <button type="button" className="player-search-clear" onClick={handleClear}>
                  <X size={14} />
                </button>
              )}
            </div>

            {/* [Suggestions] onMouseDown: onBlur より先に発火させてドロップダウンを閉じさせない */}
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

        {/* Results */}
        {/* Status messages */}
        {!loading && errorMessage && (
          <ErrorCard message={errorMessage} />
        )}

        {!loading && !errorMessage && players.length > 0 && (
          <p className="status-message">
            <span className="count-badge count-badge--leading">
              {players.length}
            </span>
            {players.length === 1 ? "player" : "players"} found
          </p>
        )}

        {!loading && !errorMessage && hasSearched && players.length === 0 && (
          <div className="home-empty-state">
            <span className="empty-state-icon"><SearchIcon size={36} strokeWidth={1.5} /></span>
            <p className="empty-state-title">No players found</p>
            <p className="empty-state-desc">
              Try a different name or check the spelling.
            </p>
          </div>
        )}

        {/* Skeleton or results grid */}
        {loading ? (
          <div className="pcard-list">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="pcard-list">
            {players.map((player) => (
              <ExternalPlayerCard
                key={player.mlbPlayerId}
                player={player}
                alreadySaved={isAlreadySaved(player)}
                detailState={{
                  from: `/search?keyword=${encodeURIComponent(keyword)}`,
                  fromLabel: "Back to Search",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchPage;
