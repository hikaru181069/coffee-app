import { Link, Navigate } from "react-router-dom";
import { Target, TrendingUp, Star } from "lucide-react";
import { getAuthToken } from "../utils/authStorage";
import heroStyles from "./LandingHero.module.css";

const MLB_LOGO = "https://www.mlbstatic.com/team-logos/league-on-dark/1.svg";

const HERO_TITLE = "Find the players you'll love next.";

// Home Hero(HomeHero.jsx)のScout Notesと同じアイコンを使い、実際の機能との
// 視覚的な一貫性を保つ。あくまで説明用のカードでリンクは持たせない
// (以前のTILES/Browse by StyleはProtectedRoute配下へのリンクで、
// 未ログインで訪問すると/landingへ戻されるだけの壊れたループになっていた)。
const HOW_IT_WORKS = [
  {
    icon: Star,
    title: "Add Your Favorites",
    desc: "Star the players you already like.",
  },
  {
    icon: TrendingUp,
    title: "AI Analyzes Play Styles",
    desc: "Power, speed, contact, defense — all scored.",
  },
  {
    icon: Target,
    title: "Discover New Favorites",
    desc: "Get matched with players who play just like them.",
  },
];
function LandingPage() {
  const token = getAuthToken();
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="landing-page">

      {/* ミニナビ */}
      <nav className="landing-nav">
        <img src={MLB_LOGO} alt="MLB" className="landing-nav-logo" />
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-nav-login">Login</Link>
          <Link to="/register" className={`home-link ${heroStyles.navCta}`}>Get Started</Link>
        </div>
      </nav>

      <div className="landing-body">

        {/* ヒーロー: linear.app本家を参考に、大きな見出し一文+単語ごとの
            ブラー→フェードイン演出のみに絞る。訪問者はまだアプリを使ったことが
            ないため、特定の選手データはここでは見せない。CTAはGet Started 1つのみ。 */}
        <section className={heroStyles.hero}>
          <div className={heroStyles.grain} aria-hidden="true" />
          <p className={heroStyles.kicker}>MLB Player Discovery</p>
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

        {/* 仕組みの説明(非リンク)。3ステップで「どう機能するか」を伝える */}
        <section className={heroStyles.howItWorks}>
          {HOW_IT_WORKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={heroStyles.stepCard}>
              <span className={heroStyles.stepIcon}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <div>
                <p className={heroStyles.stepTitle}>{title}</p>
                <p className={heroStyles.stepDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}

export default LandingPage;
