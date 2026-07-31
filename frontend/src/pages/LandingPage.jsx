import { Link, Navigate } from "react-router-dom";
import { Coffee, Share2, Sparkles } from "lucide-react";
import { getAuthToken } from "../utils/authStorage";
import heroStyles from "./LandingHero.module.css";

const HERO_TITLE = "Record your coffee. Discover your taste.";

// Record → Connect → Discover の3ステップをそのまま説明カードにする
// （docs/vision.md の Core Experience）。あくまで説明用のカードで
// リンクは持たせない（未ログインで機能ページへ飛んでも
// ProtectedRouteに/landingへ戻されるだけの壊れたループになるため）。
const HOW_IT_WORKS = [
  {
    icon: Coffee,
    title: "Record",
    desc: "飲んだコーヒーを産地・フレーバーとともに記録する。",
  },
  {
    icon: Share2,
    title: "Connect",
    desc: "産地・品種・精製方法・フレーバーが記録どうしで自動につながる。",
  },
  {
    icon: Sparkles,
    title: "Discover",
    desc: "知識グラフから、自分の好みや未知の関係を発見する。",
  },
];

function LandingPage() {
  const token = getAuthToken();
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="landing-page">

      {/* ミニナビ */}
      <nav className="landing-nav">
        <span className="landing-nav-logo" aria-hidden="true" style={{ fontSize: "1.5rem" }}>☕</span>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-nav-login">Login</Link>
          <Link to="/register" className={`home-link ${heroStyles.navCta}`}>Get Started</Link>
        </div>
      </nav>

      <div className="landing-body">

        {/* ヒーロー: 大きな見出し一文+単語ごとのブラー→フェードイン演出のみに絞る。
            訪問者はまだアプリを使ったことがないため、特定の記録データは見せない。
            CTAはGet Started 1つのみ。 */}
        <section className={heroStyles.hero}>
          <div className={heroStyles.grain} aria-hidden="true" />
          <p className={heroStyles.kicker}>Coffee Journal & Knowledge Graph</p>
          <h1 className={heroStyles.title}>
            {HERO_TITLE.split(" ").map((word, i) => (
              <span key={`${word}-${i}`}>
                <span
                  className={heroStyles.word}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  {word}
                </span>{" "}
              </span>
            ))}
          </h1>
          <Link className={heroStyles.cta} to="/register">Get Started</Link>
        </section>

        {/* 仕組みの説明(非リンク)。Record → Connect → Discover の3ステップで伝える */}
        <section className={heroStyles.howItWorks}>
          {HOW_IT_WORKS.map((step) => {
            const { icon: Icon, title, desc } = step;
            return (
              <div key={title} className={heroStyles.stepCard}>
                <span className={heroStyles.stepIcon}>
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <div>
                  <p className={heroStyles.stepTitle}>{title}</p>
                  <p className={heroStyles.stepDesc}>{desc}</p>
                </div>
              </div>
            );
          })}
        </section>

      </div>
    </div>
  );
}

export default LandingPage;
