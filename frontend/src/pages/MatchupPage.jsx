// 投手 vs 打者 対戦成績ページ
// URL: /matchup?pitcher=pitcherId&batter=batterId
//
// データの流れ:
//   URL params → useEffect で両選手を自動ロード
//   → 両方選択済み → GET /api/matchup?pitcherId=X&batterId=Y
//   → 対戦成績カードを表示

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PlayerSearchSelect from "../components/PlayerSearchSelect";
import PageHeader from "../components/PageHeader";
import ErrorCard from "../components/ErrorCard";
import { getExternalPlayerDetail } from "../services/api/externalPlayerApi";
import { getMatchupStats, getMatchupPrediction } from "../services/api/matchupApi";

function SkeletonMatchupStats() {
  return (
    <div className="matchup-stats-wrap">
      <div className="skeleton-block" style={{ height: 16, width: 180, borderRadius: 4, margin: "0 auto 20px" }} />
      <div className="mstats-summary">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mstats-pill">
            <div className="skeleton-block" style={{ height: 24, width: 38, borderRadius: 4 }} />
            <div className="skeleton-block" style={{ height: 11, width: 22, borderRadius: 3, marginTop: 4 }} />
          </div>
        ))}
      </div>
      <div className="mstats-bars" style={{ marginTop: 20 }}>
        <div className="skeleton-block" style={{ height: 13, width: 80, borderRadius: 4, marginBottom: 14 }} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mbar-row">
            <div className="skeleton-block" style={{ height: 12, width: 36, borderRadius: 3 }} />
            <div className="skeleton-block" style={{ flex: 1, height: 8, borderRadius: 4 }} />
            <div className="skeleton-block" style={{ height: 12, width: 40, borderRadius: 3 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

const SUGGESTED_MATCHUPS = [
  { label: "Cole vs Judge",    pitcher: 543037, batter: 592450 },
  { label: "Kershaw vs Betts", pitcher: 477132, batter: 605141 },
  { label: "Cole vs Soto",     pitcher: 543037, batter: 665742 },
];

// レートスタット: 棒グラフで視覚化（max は現実的な上限値）
const RATE_STATS = [
  { key: "avg", label: "AVG", desc: "Batting Average", max: 1.0 },
  { key: "obp", label: "OBP", desc: "On-Base %",       max: 1.0 },
  { key: "slg", label: "SLG", desc: "Slugging %",      max: 4.0 },
  { key: "ops", label: "OPS", desc: "OPS",             max: 5.0 },
];

// カウント統計: シンプルな数値表示
const COUNT_STATS = [
  { key: "rbi",             label: "RBI",  desc: "RBI"       },
  { key: "baseOnBalls",     label: "BB",   desc: "Walks"     },
  { key: "numberOfPitches", label: "#P",   desc: "Pitches"   },
];

// 選手カード: Compare ページの cbattle-card と同じ構造・CSS クラスを使う
function SelectedPlayerCard({ player, side }) {
  return (
    <div className={`cbattle-card cbattle-card--${side}`}>
      {player.image && (
        <img
          src={player.image}
          alt={player.name || player.fullName}
          className="cbattle-img"
        />
      )}
      <Link
        to={`/players/${player.mlbPlayerId}`}
        state={{ from: "/matchup", fromLabel: "Back to Matchup" }}
        className="cbattle-name"
      >
        {player.name || player.fullName}
      </Link>
      <div className="cbattle-meta">
        {player.teamId && (
          <img
            src={`https://www.mlbstatic.com/team-logos/${player.teamId}.svg`}
            alt={player.team}
            style={{ width: 16, height: 16 }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <span>{player.team}</span>
        <span className="cbattle-pos">{player.position}</span>
      </div>
    </div>
  );
}

// 棒グラフ行（Compare ページのバースタイルを参考）
function RateBar({ statDef, value }) {
  const num = parseFloat(value);
  const pct = isNaN(num) ? 0 : Math.min((num / statDef.max) * 100, 100);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="mbar-row">
      {/* ラベル */}
      <span className="mbar-label">{statDef.label}</span>

      {/* バートラック */}
      <div className="mbar-track">
        <div
          className="mbar-fill"
          style={{ width: animated ? `${pct}%` : "0%" }}
        />
      </div>

      {/* 値 */}
      <span className="mbar-value">{value ?? "—"}</span>
    </div>
  );
}

// 対戦成績（新デザイン）
function MatchupStatsGrid({ stats }) {
  return (
    <div className="matchup-stats-wrap">
      <p className="matchup-stats-title">Career Matchup Stats</p>

      {/* ① サマリー行: 主要カウントをピルで一覧 */}
      <div className="mstats-summary">
        {[
          { label: "G",  value: stats.gamesPlayed },
          { label: "AB", value: stats.atBats       },
          { label: "H",  value: stats.hits          },
          { label: "HR", value: stats.homeRuns      },
          { label: "SO", value: stats.strikeOuts    },
        ].map(({ label, value }) => (
          <div key={label} className="mstats-pill">
            <span className="mstats-pill-value">{value ?? "—"}</span>
            <span className="mstats-pill-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ② レートスタット: 棒グラフ */}
      <div className="mstats-bars">
        <p className="mstats-section-title">Rate Stats</p>
        {RATE_STATS.map((s) => (
          <RateBar key={s.key} statDef={s} value={stats[s.key]} />
        ))}
      </div>

      {/* ③ 補足カウント */}
      <div className="mstats-counts">
        <p className="mstats-section-title">Additional</p>
        <div className="mstats-count-row">
          {COUNT_STATS.map(({ key, label, desc }) => (
            <div key={key} className="mstats-count-cell">
              <span className="mstats-count-value">{stats[key] ?? "—"}</span>
              <span className="mstats-count-label">{label}</span>
              <span className="mstats-count-desc">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Matchup Prediction (FastAPI /matchup/predict の結果を表示) ───────────────
function PredictionBar({ label, value, max, color }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="pred-bar-row">
      <span className="pred-bar-label">{label}</span>
      <div className="pred-bar-track">
        <div
          className={`pred-bar-fill pred-bar-fill--${color}`}
          style={{ width: animated ? `${pct}%` : "0%" }}
        />
      </div>
      <span className="pred-bar-value">{value}</span>
    </div>
  );
}

function MatchupPrediction({ prediction, pitcherName, batterName }) {
  if (!prediction) return null;

  const {
    expectedBA, kProbability, bbProbability, hrProbabilityPerPA,
    advantage, advantageScore, pitcherQualityScore, batterQualityScore, insight,
  } = prediction;

  const advantageLabel =
    advantage === "pitcher" ? pitcherName :
    advantage === "batter"  ? batterName  : "Even";

  return (
    <div className="pred-wrap">
      <p className="pred-title">Matchup Prediction</p>
      <p className="pred-subtitle">Based on 2025 season stats vs league distribution</p>

      {/* アドバンテージバー */}
      <div className="pred-adv-row">
        <span className="pred-adv-name pred-adv-name--pitcher">{pitcherName}</span>
        <div className="pred-adv-track">
          <div
            className={`pred-adv-fill pred-adv-fill--${advantage}`}
            style={{ width: `${advantageScore}%` }}
          />
        </div>
        <span className="pred-adv-name pred-adv-name--batter">{batterName}</span>
      </div>
      <p className="pred-adv-label">
        {advantageLabel === "Even" ? "Competitive Matchup" : `${advantageLabel} Advantage`}
      </p>

      {/* 品質スコア */}
      <div className="pred-quality-row">
        <div className="pred-quality-pill pred-quality-pill--pitcher">
          <span className="pred-quality-score">{pitcherQualityScore}</span>
          <span className="pred-quality-label">Pitcher Quality</span>
        </div>
        <div className="pred-quality-pill pred-quality-pill--batter">
          <span className="pred-quality-score">{batterQualityScore}</span>
          <span className="pred-quality-label">Batter Quality</span>
        </div>
      </div>

      {/* 予想成績バー */}
      <div className="pred-bars">
        <p className="mstats-section-title">Predicted Outcomes</p>
        <PredictionBar label="Expected BA"  value={expectedBA}        max={0.5}  color="blue" />
        <PredictionBar label="K %"          value={`${kProbability}%`}  max={60}   color="red"  />
        <PredictionBar label="BB %"         value={`${bbProbability}%`} max={25}   color="green"/>
        <PredictionBar label="HR / PA"      value={`${hrProbabilityPerPA}%`} max={15} color="orange"/>
      </div>

      {/* インサイト */}
      <p className="pred-insight">{insight}</p>
    </div>
  );
}

function MatchupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pitcher, setPitcher] = useState(null);
  const [batter, setBatter] = useState(null);
  const [matchupStats, setMatchupStats] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingInit, setLoadingInit] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // URL params から選手を自動ロード (PlayerDetailPage からの導線)
  useEffect(() => {
    const pitcherId = searchParams.get("pitcher");
    const batterId  = searchParams.get("batter");
    if (!pitcherId && !batterId) return;

    const load = async () => {
      setLoadingInit(true);
      try {
        const [p, b] = await Promise.all([
          pitcherId ? getExternalPlayerDetail(pitcherId) : Promise.resolve(null),
          batterId  ? getExternalPlayerDetail(batterId)  : Promise.resolve(null),
        ]);
        if (p) setPitcher(p);
        if (b) setBatter(b);
      } catch {
        // silent fallback
      } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, []);  // 初回マウント時のみ

  // 両選手が揃ったら対戦成績 + 予想成績を並列取得
  useEffect(() => {
    if (!pitcher || !batter) {
      setMatchupStats(null);
      setPrediction(null);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError("");
      try {
        const [stats, pred] = await Promise.all([
          getMatchupStats(pitcher.mlbPlayerId, batter.mlbPlayerId),
          getMatchupPrediction(pitcher.mlbPlayerId, batter.mlbPlayerId),
        ]);
        setMatchupStats(stats);
        setPrediction(pred);
      } catch {
        setError("Failed to load matchup stats.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [pitcher, batter, retryKey]);

  // 選手選択時に URL params を更新（ブックマーク・共有対応）
  const handleSetPitcher = (p) => {
    setPitcher(p);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p) next.set("pitcher", p.mlbPlayerId);
      else next.delete("pitcher");
      return next;
    });
  };

  const handleSetBatter = (b) => {
    setBatter(b);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (b) next.set("batter", b.mlbPlayerId);
      else next.delete("batter");
      return next;
    });
  };

  const bothSelected = pitcher && batter;

  return (
    <div className="app-screen">
      <PageHeader
        kicker={`${new Date().getFullYear()} Career`}
        title="Pitcher vs Batter"
        subtitle="Select a pitcher and a batter to see their career head-to-head stats."
        backTo="/favorites"
        backLabel="Pick from Favorites"
      />

      <div className="screen-body px-6 py-6 w-full">
        {loadingInit ? (
          <SkeletonMatchupStats />
        ) : (
          <>
            {/* 選手選択スロット */}
            <div className="compare-search-row">
              <PlayerSearchSelect
                label="Pitcher"
                player={pitcher}
                onSelect={handleSetPitcher}
              />
              <div className="compare-vs">VS</div>
              <PlayerSearchSelect
                label="Batter"
                player={batter}
                onSelect={handleSetBatter}
              />
            </div>

            {/* 選択済みカード: Compare ページと同じ cbattle-header 構造 */}
            {bothSelected && (
              <div className="cbattle-wrap">
                <div className="cbattle-header">
                  <div className="cbattle-side cbattle-side--left">
                    <SelectedPlayerCard player={pitcher} side="left" />
                  </div>
                  <div className="cbattle-vs-col">
                    <span className="cbattle-vs">VS</span>
                  </div>
                  <div className="cbattle-side cbattle-side--right">
                    <SelectedPlayerCard player={batter} side="right" />
                  </div>
                </div>
              </div>
            )}

            {/* FastAPI 予想成績 */}
            {bothSelected && !loading && (
              <MatchupPrediction
                prediction={prediction}
                pitcherName={pitcher?.fullName || pitcher?.name || "Pitcher"}
                batterName={batter?.fullName  || batter?.name  || "Batter"}
              />
            )}

            {/* MLB Stats API 実際の対戦成績 */}
            {loading && <SkeletonMatchupStats />}

            {error && <ErrorCard message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

            {!loading && matchupStats && (
              matchupStats.hasData ? (
                <MatchupStatsGrid stats={matchupStats.stats} />
              ) : (
                <div className="tool-result-note">
                  <p>No career matchup data found for this pair.</p>
                </div>
              )
            )}

            {/* Compare へのクロスリンク */}
            {bothSelected && !loading && batter && (
              <div className="compare-crosslink-row">
                <Link
                  to={`/compare?p1=${batter.mlbPlayerId}`}
                  className="compare-crosslink"
                >
                  Compare Batter Stats →
                </Link>
              </div>
            )}

            {/* 未選択の案内 */}
            {!bothSelected && !loading && (
              <div className="compare-empty">
                <p className="compare-empty-hint">
                  Select a pitcher and a batter — or try a quick pick:
                </p>
                <div className="compare-quick-picks">
                  {SUGGESTED_MATCHUPS.map(({ label, pitcher, batter: b }) => (
                    <Link
                      key={label}
                      to={`/matchup?pitcher=${pitcher}&batter=${b}`}
                      className="compare-quick-pick"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MatchupPage;
