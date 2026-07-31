import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { getCurrentUser } from "../services/api/userApi";
import { getForYouRecommendations } from "../services/api/recommendationApi";
import { getPlayersByArchetype } from "../services/api/archetypeApi";
import { clearAuthData, getAuthToken } from "../utils/authStorage";
import { isUnauthorizedError } from "../services/api/apiError";

import HomeHero from "../components/HomeHero";

import styles from "./HomePage.module.css";

// Home画面の「Browse by Style」で使うアーキタイプ一覧。
// 既存の/api/archetype/:typeをそのまま使う。
const ARCHETYPES = [
  { type: "power-hitter", label: "Power Hitter" },
  { type: "speedster", label: "Speedster" },
  { type: "contact-hitter", label: "Contact Hitter" },
  { type: "ace", label: "Ace" },
  { type: "power-pitcher", label: "Power Pitcher" },
  { type: "workhorse", label: "Workhorse" },
  { type: "elite-defender", label: "Elite Defender" },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

// ── ホームページ ───────────────────────────────────────────────────────────
// 「発見を最優先・情報を詰め込みすぎない」という方針のもと、Home全体の役割を
// 「今日イチオシの1人を見せる入口」に絞った。Popular Players・Recently Viewed・
// Categories別行・Toolsタイルなどは、既存のサイドバー/ボトムタブバーの
// ナビゲーションで到達できるため、ここでは重複させない。
function HomePage() {
  const [user, setUser] = useState(null);
  const [forYouData, setForYouData] = useState(null);
  const [forYouLoading, setForYouLoading] = useState(true);
  const [samplePlayer, setSamplePlayer] = useState(null);
  const token = getAuthToken();

  useEffect(() => {
    getCurrentUser(token)
      .then(setUser)
      .catch((err) => {
        if (isUnauthorizedError(err)) clearAuthData();
      });
  }, [token]);

  useEffect(() => {
    getForYouRecommendations(token)
      .catch(() => ({ groups: [], fallback: [] }))
      .then((data) => {
        setForYouData(data);
        setForYouLoading(false);
      });
  }, [token]);

  // お気に入りが0件でForYouデータが空になる場合のためのフォールバック。
  // 単なる空状態のテキストだけだと、初めてこのアプリを開いた人には
  // Heroの一番の見せ場(スカウトレポート)が全く伝わらない。代わりに、
  // 既存のarchetypeエンドポイント(styleScores計算済み)から人気選手を1人取り、
  // 「サンプル」として同じダッシュボードを見せる。
  useEffect(() => {
    getPlayersByArchetype("power-hitter")
      .catch(() => [])
      .then((players) => setSamplePlayer(players[0] ?? null));
  }, []);

  // 全グループのmatchesをまとめ、matchScore(類似度×行動学習の好みスコアの
  // ブレンド値。バックエンド側でグループ内の並び替えにも使っているのと同じ値)
  // が最も高い1人だけを「今日イチオシの1人」として採用する。複数人を切り替えて
  // じっくり見る体験はDiscover画面の役割なので、Homeでは前後送りを付けない。
  // seedPlayerを各matchに付与しておくことで、Heroの「お気に入りとの比較」表示
  // (どの favorite を根拠に推薦されたか)がそのまま使える。
  const heroPick = forYouData?.groups?.length
    ? (forYouData.groups
        .flatMap((group) => group.matches.map((match) => ({ ...match, seedPlayer: group.seedPlayer })))
        .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))[0] ?? null)
    : null;

  // 個人化された推薦(heroPick)が無い場合だけサンプルにフォールバックする。
  // ローディング中に一瞬サンプルが出てしまわないよう、forYouLoading完了後のみ判定する。
  const showSample = !forYouLoading && !heroPick && samplePlayer;
  const displayPlayer = heroPick ?? (showSample ? samplePlayer : null);

  return (
    <div className="home-discovery">
      <header className="home-discovery-header">
        <p className="home-greeting">
          {getGreeting()}
          {user?.name ? `, ${user.name}` : ""}
        </p>
      </header>

      <HomeHero
        key={displayPlayer?.mlbPlayerId ?? "empty"}
        player={displayPlayer}
        loading={forYouLoading}
        isSample={!heroPick && Boolean(showSample)}
      />

      {/* プレイスタイル別に探す */}
      <section className="discovery-section">
        <div className="discovery-section-header">
          <div className="discovery-section-title-row">
            <h2 className="discovery-section-title">Browse by Style</h2>
            <Link to="/positions" className="discovery-see-all">
              Browse by Position →
            </Link>
          </div>
          <p className="discovery-section-desc">
            Explore players by playing style
          </p>
        </div>
        <div className="discovery-archetypes">
          {ARCHETYPES.map((a) => (
            <Link key={a.type} to={`/archetype/${a.type}`} className={styles.archetypePill}>
              {a.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
