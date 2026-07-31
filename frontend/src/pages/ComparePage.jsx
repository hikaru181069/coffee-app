import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PlayerSearchSelect from "../components/PlayerSearchSelect";
import PageHeader from "../components/PageHeader";
import { getExternalPlayerDetail } from "../services/api/externalPlayerApi";
import { getCompareAnalysis } from "../services/api/compareApi";

function SkeletonBattleCard() {
  return (
    <div className="cbattle-wrap">
      <div className="cbattle-header">
        {["left", "right"].map((side, idx) => (
          <>
            {idx === 1 && <div className="cbattle-vs-col"><span className="cbattle-vs">VS</span></div>}
            <div key={side} className={`cbattle-side cbattle-side--${side}`}>
              <div className={`cbattle-card cbattle-card--${side}`}>
                <div className="skeleton-block cbattle-img" style={{ borderRadius: 8 }} />
                <div className="skeleton-block" style={{ height: 15, width: 110, borderRadius: 4, margin: "8px auto 4px" }} />
                <div className="skeleton-block" style={{ height: 12, width: 80, borderRadius: 3, margin: "0 auto" }} />
              </div>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

// Quick-pick pairs for the empty state — links to URL params so existing loader handles them
const SUGGESTED_PAIRS = [
  { label: "Judge vs Soto",     p1: 592450, p2: 665742 },
  { label: "Betts vs Acuña",    p1: 605141, p2: 660670 },
  { label: "Freeman vs Trout",  p1: 518692, p2: 545361 },
  { label: "Cole vs Kershaw",   p1: 543037, p2: 477132 },
];

// --- stat definitions ---
const HITTER_STATS = [
  { key: "gamesPlayed",    label: "G",   higherIsBetter: true },
  { key: "battingAverage", label: "AVG", higherIsBetter: true },
  { key: "homeRuns",       label: "HR",  higherIsBetter: true },
  { key: "rbis",           label: "RBI", higherIsBetter: true },
  { key: "ops",            label: "OPS", higherIsBetter: true },
];

const PITCHER_STATS = [
  { key: "gamesPlayed",    label: "G",   higherIsBetter: true },
  { key: "wins",           label: "W",   higherIsBetter: true },
  { key: "era",            label: "ERA", higherIsBetter: false },
  { key: "strikeouts",     label: "K",   higherIsBetter: true },
  { key: "inningsPitched", label: "IP",  higherIsBetter: true },
];

// --- helpers ---
const toNum = (v) => {
  if (v == null || v === "" || v === "-") return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
};

const calcWinner = (a, b, higherIsBetter) => {
  const na = toNum(a);
  const nb = toNum(b);
  if (na == null || nb == null) return null;
  if (na === nb) return "tie";
  return higherIsBetter ? (na > nb ? "left" : "right") : (na < nb ? "left" : "right");
};

// 左右のバー幅 (%) を計算
const barPcts = (lv, rv, higherIsBetter) => {
  const ln = toNum(lv);
  const rn = toNum(rv);
  if (ln == null && rn == null) return [0, 0];
  if (ln == null) return [0, 100];
  if (rn == null) return [100, 0];
  if (ln === rn) return [100, 100];
  if (higherIsBetter) {
    const m = Math.max(ln, rn);
    return [ln / m * 100, rn / m * 100];
  } else {
    // 低い方が優秀 (ERA等): 低いほど長いバー
    const minV = Math.min(ln, rn);
    return [minV / ln * 100, minV / rn * 100];
  }
};

// --- StatBarRow ---
function StatBarRow({ stat, leftStats, rightStats, ready }) {
  const lv = leftStats?.[stat.key];
  const rv = rightStats?.[stat.key];
  const w = calcWinner(lv, rv, stat.higherIsBetter);
  const [lPct, rPct] = barPcts(lv, rv, stat.higherIsBetter);

  return (
    <div className="cbar-row">
      {/* 左値 */}
      <span className={`cbar-val cbar-val--left ${w === "left" ? "cbar-val--win" : ""}`}>
        {lv ?? "—"}
      </span>

      {/* 左バー（中央 → 左へ伸びる） */}
      <div className="cbar-track cbar-track--left">
        <div
          className={`cbar-fill cbar-fill--left ${w === "left" ? "cbar-fill--win-left" : ""}`}
          style={{ width: ready ? `${lPct}%` : "0%" }}
        />
      </div>

      {/* ラベル */}
      <span className="cbar-label">{stat.label}</span>

      {/* 右バー（中央 → 右へ伸びる） */}
      <div className="cbar-track cbar-track--right">
        <div
          className={`cbar-fill cbar-fill--right ${w === "right" ? "cbar-fill--win-right" : ""}`}
          style={{ width: ready ? `${rPct}%` : "0%" }}
        />
      </div>

      {/* 右値 */}
      <span className={`cbar-val cbar-val--right ${w === "right" ? "cbar-val--win" : ""}`}>
        {rv ?? "—"}
      </span>
    </div>
  );
}

// --- StatBarsSection ---
function StatBarsSection({ title, stats, leftStats, rightStats }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (!leftStats && !rightStats) return null;

  return (
    <div className="cbar-section">
      <p className="cbar-section-title">{title}</p>
      {stats.map((stat) => (
        <StatBarRow
          key={stat.key}
          stat={stat}
          leftStats={leftStats}
          rightStats={rightStats}
          ready={ready}
        />
      ))}
    </div>
  );
}

// --- PlayerBattleCard ---
function PlayerBattleCard({ player, side }) {
  return (
    <div className={`cbattle-card cbattle-card--${side}`}>
      {player.image && (
        <img
          src={player.image}
          alt={player.name || player.fullName}
          className="cbattle-img"
        />
      )}
      <Link to={`/players/${player.mlbPlayerId}`} className="cbattle-name">
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

// --- BattleResult (VS animation + bars) ---
function BattleResult({ player1, player2, leftHitter, leftPitcher, rightHitter, rightPitcher }) {
  const showHitter  = leftHitter  || rightHitter;
  const showPitcher = leftPitcher || rightPitcher;

  return (
    <div className="cbattle-wrap">
      {/* VS ヘッダー */}
      <div className="cbattle-header">
        <div className="cbattle-side cbattle-side--left">
          <PlayerBattleCard player={player1} side="left" />
        </div>

        <div className="cbattle-vs-col">
          <span className="cbattle-vs">VS</span>
        </div>

        <div className="cbattle-side cbattle-side--right">
          <PlayerBattleCard player={player2} side="right" />
        </div>
      </div>

      {/* バーグラフ */}
      <div className="cbattle-stats">
        {/* プレイヤー名ヘッダー */}
        <div className="cbar-names">
          <span className="cbar-name cbar-name--left">
            {player1.name || player1.fullName}
          </span>
          <span className="cbar-name-center" />
          <span className="cbar-name cbar-name--right">
            {player2.name || player2.fullName}
          </span>
        </div>

        {showHitter && (
          <StatBarsSection
            title="Hitting"
            stats={HITTER_STATS}
            leftStats={leftHitter}
            rightStats={rightHitter}
          />
        )}
        {showPitcher && (
          <StatBarsSection
            title="Pitching"
            stats={PITCHER_STATS}
            leftStats={leftPitcher}
            rightStats={rightPitcher}
          />
        )}
      </div>
    </div>
  );
}

// --- StatisticalEdge (FastAPI /compare/analyze の結果を表示) ---
const CAT_LABEL = {
  ops: "OPS", homeRuns: "HR", stolenBases: "SB", avg: "AVG", rbi: "RBI",
  era: "ERA", whip: "WHIP", strikeouts: "K", walks: "BB", wins: "W", innings: "IP",
};

function StatisticalEdge({ analysis, name1, name2 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!analysis) return null;

  const { edgeScore, overallEdge, insight, categoryWinners,
          player1Percentiles, player2Percentiles } = analysis;

  // edgeScore 0-100: 50=互角、>50=player1 有利
  const p1Pct = edgeScore;          // player1 バーの幅
  const p2Pct = 100 - edgeScore;    // player2 バーの幅

  return (
    <div className="edge-wrap">
      <p className="edge-title">Statistical Edge</p>

      {/* 左右バー */}
      <div className="edge-bar-row">
        <span className="edge-name edge-name--left">{name1}</span>
        <div className="edge-bar-track">
          <div
            className="edge-bar-fill edge-bar-fill--left"
            style={{ width: visible ? `${p1Pct}%` : "50%" }}
          />
          <div
            className="edge-bar-fill edge-bar-fill--right"
            style={{ width: visible ? `${p2Pct}%` : "50%" }}
          />
        </div>
        <span className="edge-name edge-name--right">{name2}</span>
      </div>

      {/* スコア表示 */}
      <div className="edge-score-row">
        <span className={`edge-score-num ${overallEdge === "player1" ? "edge-score-num--win" : ""}`}>
          {p1Pct}
        </span>
        <span className="edge-score-sep">—</span>
        <span className={`edge-score-num ${overallEdge === "player2" ? "edge-score-num--win" : ""}`}>
          {p2Pct}
        </span>
      </div>

      {/* インサイト文 */}
      <p className="edge-insight">{insight}</p>

      {/* カテゴリ別ピル */}
      <div className="edge-cats">
        {Object.entries(categoryWinners).map(([cat, winner]) => {
          const p1 = player1Percentiles[cat] ?? 0;
          const p2 = player2Percentiles[cat] ?? 0;
          return (
            <div key={cat} className={`edge-cat edge-cat--${winner}`}>
              <span className="edge-cat-label">{CAT_LABEL[cat] ?? cat}</span>
              <span className="edge-cat-scores">{p1} vs {p2}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Main page ---
function ComparePage() {
  const [searchParams] = useSearchParams();
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loadingInit, setLoadingInit] = useState(false);

  // URL params から自動ロード (Favorites / Matchup クロスリンク経由)
  useEffect(() => {
    const p1 = searchParams.get("p1");
    const p2 = searchParams.get("p2");
    if (!p1 && !p2) return;

    const load = async () => {
      setLoadingInit(true);
      try {
        const [d1, d2] = await Promise.all([
          p1 ? getExternalPlayerDetail(p1) : Promise.resolve(null),
          p2 ? getExternalPlayerDetail(p2) : Promise.resolve(null),
        ]);
        if (d1) setPlayer1(d1);
        if (d2) setPlayer2(d2);
      } catch {
        // silent fallback
      } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, [searchParams]);

  // 両選手が揃ったら FastAPI 分析を取得
  useEffect(() => {
    if (!player1?.mlbPlayerId || !player2?.mlbPlayerId) {
      setAnalysis(null);
      return;
    }
    getCompareAnalysis(player1.mlbPlayerId, player2.mlbPlayerId)
      .then(setAnalysis)
      .catch(() => setAnalysis(null));
  }, [player1?.mlbPlayerId, player2?.mlbPlayerId]);

  const season     = new Date().getFullYear();
  const bothLoaded = player1 && player2;

  // players が変わるたびに VS アニメーションをリセットするキー
  const animKey = `${player1?.mlbPlayerId ?? "x"}-${player2?.mlbPlayerId ?? "x"}`;

  const leftHitter  = player1?.currentSeasonStats?.hitterStats  || player1?.hitterStats;
  const leftPitcher = player1?.currentSeasonStats?.pitcherStats || player1?.pitcherStats;
  const rightHitter = player2?.currentSeasonStats?.hitterStats  || player2?.hitterStats;
  const rightPitcher= player2?.currentSeasonStats?.pitcherStats || player2?.pitcherStats;

  const name1 = player1?.fullName || player1?.name || "Player 1";
  const name2 = player2?.fullName || player2?.name || "Player 2";

  return (
    <div className="app-screen">
      <PageHeader
        kicker={`${season} Season`}
        title="Player Compare"
        subtitle="Search two players or select from your Favorites to compare stats."
        backTo="/favorites"
        backLabel="Pick from Favorites"
      />

      <div className="screen-body px-6 py-6 w-full">
        {loadingInit ? (
          <SkeletonBattleCard />
        ) : (
          <>
            {/* 検索スロット */}
            <div className="compare-search-row">
              <PlayerSearchSelect label="Player 1" player={player1} onSelect={setPlayer1} />
              <div className="compare-vs">VS</div>
              <PlayerSearchSelect label="Player 2" player={player2} onSelect={setPlayer2} />
            </div>

            {/* VS アニメーション + バーグラフ */}
            {bothLoaded && (
              <BattleResult
                key={animKey}
                player1={player1}
                player2={player2}
                leftHitter={leftHitter}
                leftPitcher={leftPitcher}
                rightHitter={rightHitter}
                rightPitcher={rightPitcher}
              />
            )}

            {/* FastAPI 統計的優劣分析 */}
            {bothLoaded && (
              <StatisticalEdge
                key={animKey}
                analysis={analysis}
                name1={name1}
                name2={name2}
              />
            )}

            {/* Pitcher vs Batter 対戦ページへのクロスリンク */}
            {bothLoaded && (() => {
              const isPitcher1 = player1?.playerType === "pitcher";
              const isPitcher2 = player2?.playerType === "pitcher";
              if (isPitcher1 !== isPitcher2) {
                const pitcherId = isPitcher1 ? player1.mlbPlayerId : player2.mlbPlayerId;
                const batterId  = isPitcher1 ? player2.mlbPlayerId : player1.mlbPlayerId;
                return (
                  <div className="compare-crosslink-row">
                    <Link
                      to={`/matchup?pitcher=${pitcherId}&batter=${batterId}`}
                      className="compare-crosslink"
                    >
                      View Head-to-Head Matchup →
                    </Link>
                  </div>
                );
              }
              return null;
            })()}

            {!bothLoaded && (
              <div className="compare-empty">
                <p className="compare-empty-hint">
                  Search for any two players, or try a quick pick:
                </p>
                <div className="compare-quick-picks">
                  {SUGGESTED_PAIRS.map(({ label, p1, p2 }) => (
                    <Link
                      key={label}
                      to={`/compare?p1=${p1}&p2=${p2}`}
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

export default ComparePage;
