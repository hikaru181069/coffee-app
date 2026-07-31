import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Target, TrendingUp, Star, ArrowRight } from "lucide-react";
import { getPlayerBios, getPlayerProfiles } from "../services/api/externalPlayerApi";
import { mlbTeams } from "../services/mlbTeams";
import { getTeamColor } from "../services/teamColors";
import styles from "./HomeHero.module.css";

const HITTER_BARS = [
  { key: "power", label: "Power" },
  { key: "contact", label: "Contact" },
  { key: "speed", label: "Speed" },
  { key: "defense", label: "Defense" },
];

const PITCHER_BARS = [
  { key: "dominance", label: "Dominance" },
  { key: "control", label: "Control" },
  { key: "durability", label: "Durability" },
];

// スカウトノート用の一言。「なぜ推薦したか」だけでなく、スタイルスコアの中で
// 突出している軸(80以上)を1つだけ短い評価コメントにする。新しいAIモデルは使わず、
// 既存のstyleScores(パーセンタイル)から最大値を選ぶだけ。
const HITTER_TRAITS = {
  power: "Well above-average raw power",
  speed: "Plus speed on the bases",
  contact: "Elite bat-to-ball skills",
  defense: "Standout defensive range",
};
const PITCHER_TRAITS = {
  dominance: "Overpowering strikeout stuff",
  control: "Exceptional command of the zone",
  durability: "Built to eat innings",
};

const getTraitNote = (scores, isPitcher) => {
  if (!scores) return null;
  const traits = isPitcher ? PITCHER_TRAITS : HITTER_TRAITS;
  const best = Object.keys(traits)
    .map((key) => ({ key, value: scores[key] }))
    .filter((t) => t.value != null && t.value >= 80)
    .sort((a, b) => b.value - a.value)[0];
  return best ? traits[best.key] : null;
};

const HEADSHOT_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

// MLB公式の画像基盤(img.mlbstatic.com。Headshotと同じCDN)が提供している
// アクション写真バリアント。サードパーティのライセンス画像やスクレイピングではない。
const ACTION_PHOTO_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/w_1600,q_auto:best/v1/people/${id}/action/hero/current`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const confidenceLabel = (score) => {
  if (score >= 85) return "High Confidence";
  if (score >= 65) return "Good Match";
  return "Developing Match";
};

const statTierLabel = (value) => {
  if (value >= 85) return "Elite";
  if (value >= 65) return "Above Average";
  if (value >= 40) return "Average";
  return "Below Average";
};

const HAND_LABEL = { L: "L", R: "R", S: "S" };

/**
 * Home画面唯一の主役。「スタッツを表示するカード」ではなく
 * 「AIが今日あなたに届けるスカウトレポート1枚」という見せ方にする。
 * 演出: Glassカードのフェードイン → Match%のカウントアップ → 選手写真のフェードイン
 * → Scout Notesの順次表示 → 能力バーが左から伸びる。前後送りは付けない
 * (複数人を切り替える体験はDiscover画面の役割のまま)。
 *
 * player.mlbPlayerIdをkeyにしてHomePage側でマウントし直す前提のコンポーネント。
 * 選手が変わるたびにstage/displayedMatchをリセットする代わりに、
 * useStateの初期値として1回だけ計算する(エフェクト内での直接setStateを避けるため)。
 */
function HomeHero({ player, loading, isSample = false }) {
  const [bio, setBio] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stage, setStage] = useState(() => (prefersReducedMotion() ? 5 : 0));
  const [displayedMatch, setDisplayedMatch] = useState(() =>
    prefersReducedMotion()
      ? Math.round(player?.matchScore ?? player?.similarityPercentage ?? 0)
      : 0,
  );
  const rafRef = useRef(null);

  useEffect(() => {
    if (!player?.mlbPlayerId) return undefined;
    let active = true;
    Promise.all([
      getPlayerBios([player.mlbPlayerId]),
      getPlayerProfiles([player.mlbPlayerId]),
    ]).then(([bios, profiles]) => {
      if (!active) return;
      setBio(bios[player.mlbPlayerId] ?? null);
      setProfile(profiles[player.mlbPlayerId] ?? null);
    });
    return () => { active = false; };
  }, [player?.mlbPlayerId]);

  // 演出のステージ管理: 0=非表示 → 1=カード → 2=カウントアップ開始
  // → 3=選手写真 → 4=Scout Notes → 5=能力バー
  useEffect(() => {
    if (!player?.mlbPlayerId || prefersReducedMotion()) return undefined;

    const timers = [
      setTimeout(() => setStage(1), 60),
      setTimeout(() => setStage(2), 520),
      setTimeout(() => setStage(3), 1380),
      setTimeout(() => setStage(4), 1860),
      setTimeout(() => setStage(5), 2760),
    ];
    return () => timers.forEach(clearTimeout);
  }, [player?.mlbPlayerId]);

  // Match%のカウントアップ本体(rAFで数値だけ進める。フェード/伸長はCSS側)
  // サンプル表示(isSample)は比較対象が無く%が意味を持たないためスキップする。
  useEffect(() => {
    if (stage < 2 || !player?.mlbPlayerId || isSample || prefersReducedMotion()) return undefined;
    const target = Math.round(player.matchScore ?? player.similarityPercentage ?? 0);
    const duration = 700;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayedMatch(Math.round(target * progress));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, player?.mlbPlayerId, player?.matchScore, player?.similarityPercentage, isSample]);

  if (loading) {
    return (
      <section className={styles.hero}>
        <div className="skeleton-block" style={{ height: 460, borderRadius: 28 }} />
      </section>
    );
  }

  if (!player) {
    return (
      <section className={`${styles.hero} ${styles.visible}`}>
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          AI Scout Report
        </p>
        <p className={styles.emptyTitle}>Add a few favorites to get your first report</p>
        <p className={styles.emptyDesc}>
          We&apos;ll find a player who matches your taste.
        </p>
        <Link to="/favorites" className={styles.emptyCta}>Go to Favorites →</Link>
      </section>
    );
  }

  const isPitcher = player.playerType === "pitcher";
  const bars = isPitcher ? PITCHER_BARS : HITTER_BARS;
  const scores = player.styleScores;
  const matchValue = Math.round(player.matchScore ?? player.similarityPercentage ?? 0);
  const archetype = player.archetypes?.[0];
  const seed = player.seedPlayer;

  const teamId = player.teamId
    ?? mlbTeams.find((t) => t.name.toLowerCase() === (player.team || "").toLowerCase())?.id;
  const teamColor = getTeamColor(teamId);

  const debutYear = profile?.mlbDebutDate?.slice(0, 4);
  const birthplace = [profile?.birthCity, profile?.birthStateProvince || profile?.birthCountry]
    .filter(Boolean)
    .join(", ");
  const throwHand = HAND_LABEL[profile?.pitchHand];
  const batHand = HAND_LABEL[profile?.batSide];

  const notes = [
    player.reason && { icon: Target, title: "Style Match", description: player.reason },
    getTraitNote(scores, isPitcher) && {
      icon: TrendingUp,
      title: "Standout Tool",
      description: getTraitNote(scores, isPitcher),
    },
    bio && { icon: Star, title: "Background", description: bio },
  ].filter(Boolean);

  return (
    <section
      className={`${styles.hero} ${stage >= 1 ? styles.visible : ""}`}
      style={{ "--team-color": teamColor }}
    >
      <div className={styles.topBar}>
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          AI Scout Report
        </p>
        <Link to={`/players/${player.mlbPlayerId}`} className={styles.detailLink}>
          View player →
        </Link>
      </div>

      <div className={styles.grid}>
        {/* 写真パネルを全幅に拡大し、AI Matchはその上(左上)に重ねる。
            左下にはHeadshotを額装カードとして写真に重ねて配置する。 */}
        <div className={`${styles.centerCol} ${stage >= 3 ? styles.visible : ""}`}>
          <img
            className={styles.photoBg}
            src={ACTION_PHOTO_URL(player.mlbPlayerId)}
            alt=""
            aria-hidden="true"
            onError={(e) => { e.currentTarget.src = HEADSHOT_URL(player.mlbPlayerId); }}
          />

          {/* matchOverlayとleftGroupを絶対配置で個別に浮かせるのではなく、
              overlayContentという1つの通常フロー要素にまとめる。
              こうすることでこの2つの実際の高さがcenterCol自体の高さを
              決めるようになり、テキスト量がどれだけ増えても(絶対配置同士の
              当て推量のmin-heightに頼らないので)物理的に重なりようがなくなる。
              写真の方をposition:absoluteにして、この高さに追従させる。 */}
          <div className={styles.overlayContent}>
            <div className={styles.matchOverlay}>
              {isSample ? (
                <>
                  <p className={styles.blockLabel}>Sample Report</p>
                  <p className={styles.samplePick}>Popular Pick</p>
                  <p className={styles.confidence}>{archetype || "Trending Now"}</p>
                </>
              ) : (
                <>
                  <p className={styles.blockLabel}>AI Match</p>
                  <div className={styles.matchRow}>
                    <span className={styles.matchNumber}>{displayedMatch}</span>
                    <span className={styles.matchUnit}>%</span>
                  </div>
                  <p className={styles.confidence}>{confidenceLabel(matchValue)}</p>
                </>
              )}
            </div>

            {/* Headshot + 選手詳細を左端に寄せて1つのグループにする。
                align-items:stretchでHeadshotの高さを選手詳細側の高さに揃える */}
            <div className={styles.leftGroup}>
              <img
                className={styles.headshotCard}
                src={HEADSHOT_URL(player.mlbPlayerId)}
                alt={player.name}
              />

              <div className={styles.identityText}>
                <h2 className={styles.name}>{player.name}</h2>
                <p className={styles.team}>
                  {teamId && (
                    <img
                      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
                      alt=""
                      className={styles.teamLogo}
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  {player.team}
                </p>

                <div className={styles.pillRow}>
                  {player.position && <span className={styles.pill}>{player.position}</span>}
                  {profile?.number && <span className={styles.pill}>#{profile.number}</span>}
                  {(batHand || throwHand) && (
                    <span className={styles.pill}>{[batHand, throwHand].filter(Boolean).join("/")}</span>
                  )}
                </div>

                {archetype && <p className={styles.archetype}>{archetype}</p>}

                <div className={styles.factRow}>
                  {profile?.age && <span>Age {profile.age}</span>}
                  {profile?.height && profile?.weight && (
                    <span>{profile.height} / {profile.weight} lbs</span>
                  )}
                  {debutYear && <span>MLB Debut {debutYear}</span>}
                </div>
                {birthplace && <p className={styles.birthplace}>{birthplace}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* 右カラム: Scout Notes */}
        <div className={styles.rightCol}>
          <p className={styles.blockLabel}>Scout Notes</p>
          <ul className={styles.notes}>
            {notes.map(({ icon: Icon, title, description }, i) => (
              <li
                key={title}
                className={`${styles.note} ${stage >= 4 ? styles.visible : ""}`}
                style={{ transitionDelay: `${i * 220}ms` }}
              >
                <span className={styles.noteIcon}><Icon size={15} strokeWidth={2} /></span>
                <div>
                  <p className={styles.noteTitle}>{title}</p>
                  <p className={styles.noteDesc}>{description}</p>
                </div>
              </li>
            ))}
          </ul>

          {isSample ? (
            <div className={styles.seedBlock}>
              <p className={styles.blockLabel}>Get Your Own Report</p>
              <p className={styles.samplePrompt}>
                Add a few favorite players and we&apos;ll build a personalized
                scout report just for you.
              </p>
              <Link to="/favorites" className={styles.emptyCta}>Go to Favorites →</Link>
            </div>
          ) : seed && (
            <div className={styles.seedBlock}>
              <p className={styles.blockLabel}>Compared To Your Favorite</p>
              <div className={styles.seedRow}>
                <img
                  className={styles.seedThumb}
                  src={HEADSHOT_URL(seed.mlbPlayerId)}
                  alt={seed.name}
                />
                <span className={styles.seedName}>{seed.name}</span>
              </div>
              <div className={styles.seedBarTrack}>
                <div
                  className={`${styles.seedBarFill} ${stage >= 5 ? styles.visible : ""}`}
                  style={{ "--bar-value": `${Math.round(player.similarityPercentage ?? 0)}%` }}
                />
              </div>
              <p className={styles.seedSimilarity}>
                Similarity {Math.round(player.similarityPercentage ?? 0)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 能力バー: 最後に左から伸びる */}
      {scores && (
        <div className={styles.tools}>
          <p className={styles.blockLabel}>Tools</p>
          <div className={styles.toolsGrid}>
            {bars.map(({ key, label }, i) => {
              const value = scores[key];
              if (value == null) return null;
              return (
                <div className={styles.toolCol} key={key}>
                  <p className={styles.toolLabel}>{label}</p>
                  <p className={styles.toolValue}>{value}</p>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${stage >= 5 ? styles.visible : ""}`}
                      style={{ "--bar-value": `${value}%`, transitionDelay: `${i * 120}ms` }}
                    />
                  </div>
                  <p className={styles.toolTier}>{statTierLabel(value)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Link to={`/scout/${player.mlbPlayerId}`} className={styles.ctaBar}>
        <div>
          <p className={styles.ctaTitle}>Discover {player.name}&apos;s full scouting report</p>
          <p className={styles.ctaDesc}>Detailed stats, trends, and highlights</p>
        </div>
        <span className={styles.ctaButton}>
          View Scouting Report
          <ArrowRight size={15} strokeWidth={2.5} />
        </span>
      </Link>
    </section>
  );
}

export default HomeHero;
