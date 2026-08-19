import { Fragment } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Coffee, Share2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAuthToken } from "../utils/authStorage";
import CoffeeLogo from "../components/CoffeeLogo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import LandingGraphIllustration from "./LandingGraphIllustration";
import heroStyles from "./LandingHero.module.css";

// Record → Connect → Discover の3ステップをそのまま説明カードにする
// （docs/vision.md の Core Experience）。あくまで説明用のカードで
// リンクは持たせない（未ログインで機能ページへ飛んでも
// ProtectedRouteに/landingへ戻されるだけの壊れたループになるため）。
// descだけ翻訳キーにする。title・アイコンは docs/vision.md の英語表記を
// そのまま使う（Record/Connect/Discoverは言語を問わずブランド語として扱う）。
//
// 2026-08、以前は「Record→Connect→Discoverカード」と「How it worksの
// ①②③」が別セクションに分かれ同じ内容を2度説明していたため、1つの
// セクションへ統合した（ユーザーとの相談で決定）。
const HOW_IT_WORKS = [
  {
    icon: Coffee,
    title: "Record",
    descKey: "landing.steps.record.desc",
  },
  {
    icon: Share2,
    title: "Connect",
    descKey: "landing.steps.connect.desc",
  },
  {
    icon: Sparkles,
    title: "Discover",
    descKey: "landing.steps.discover.desc",
  },
];

function LandingPage() {
  const { t } = useTranslation();
  const token = getAuthToken();
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="landing-page">

      {/* ミニナビ */}
      <nav className="landing-nav">
        <span className="flex items-center gap-2 text-text">
          <CoffeeLogo size={22} />
          <span className="text-base font-black tracking-tight">Coffee App</span>
        </span>
        <div className="landing-nav-actions">
          <LanguageSwitcher />
          <Link to="/login" className="landing-nav-login">{t("nav.login")}</Link>
          <Link to="/register" className={`home-link ${heroStyles.navCta}`}>{t("auth.getStarted")}</Link>
        </div>
      </nav>

      <div className="landing-body">

        {/* ヒーロー: 大きな見出し一文+単語ごとのブラー→フェードイン演出。
            背景には装飾的な知識グラフ（実データではなく固定サンプル、
            LandingGraphIllustration参照）をごく薄く・ゆっくり漂わせる。
            訪問者はまだアプリを使ったことがないため、特定の記録データは
            見せない。CTAはGet Started 1つのみ。 */}
        <section className={heroStyles.hero}>
          <div className={heroStyles.heroGraph}>
            <LandingGraphIllustration variant="ambient" />
          </div>
          <div className={heroStyles.grain} aria-hidden="true" />
          <p className={heroStyles.kicker}>{t("landing.kicker")}</p>
          <h1 className={heroStyles.title}>
            {t("landing.hero.title").split(" ").map((word, i) => (
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
          <Link className={heroStyles.cta} to="/register">{t("auth.getStarted")}</Link>
        </section>

        {/* 仕組みの説明(非リンク)。Record → Connect → Discover の3ステップで伝える */}
        <section className={heroStyles.section}>
          <p className={heroStyles.sectionEyebrow}>Record → Connect → Discover</p>
          <div className={heroStyles.howItWorks}>
            {HOW_IT_WORKS.map((step, index) => {
              const { icon: Icon, title, descKey } = step;
              return (
                <Fragment key={title}>
                  <div className={heroStyles.stepCard}>
                    <div className={heroStyles.stepHead}>
                      <span className={heroStyles.stepIcon}>
                        <Icon size={18} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className={heroStyles.stepNumber}>0{index + 1}</span>
                    </div>
                    <div>
                      <p className={heroStyles.stepTitle}>{title}</p>
                      <p className={heroStyles.stepDesc}>{t(descKey)}</p>
                    </div>
                  </div>
                  {index < HOW_IT_WORKS.length - 1 && (
                    <span className={heroStyles.stepArrow} aria-hidden="true">
                      <ArrowRight size={18} />
                    </span>
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>

        {/* Your Knowledge Graph: 知識グラフを実際に視覚で見せる。
            プロダクトの差別化ポイント（docs/product.mdのVision）を
            言葉だけでなく図でも伝える。 */}
        <section className={heroStyles.section}>
          <p className={heroStyles.sectionEyebrow}>{t("landing.graph.heading")}</p>
          <div className={heroStyles.graphSection}>
            <LandingGraphIllustration variant="feature" />
            <p className={heroStyles.graphCaption}>{t("landing.graph.caption")}</p>
          </div>
        </section>

        {/* Why Coffee App?: docs/product.mdの「ジャーナル型（時系列に並ぶだけ）」
            との対比をそのまま図にする */}
        <section className={heroStyles.section}>
          <p className={heroStyles.sectionEyebrow}>{t("landing.comparison.heading")}</p>
          <div className={heroStyles.comparison}>
            <div className={heroStyles.comparisonCard}>
              <p className={heroStyles.comparisonLabel}>{t("landing.comparison.othersLabel")}</p>
              <p className={heroStyles.comparisonValue}>{t("landing.comparison.othersValue")}</p>
            </div>
            <ArrowRight size={20} className={heroStyles.comparisonArrow} aria-hidden="true" />
            <div className={`${heroStyles.comparisonCard} ${heroStyles.comparisonHighlight}`}>
              <p className={heroStyles.comparisonLabel}>Coffee App</p>
              <p className={heroStyles.comparisonValue}>{t("landing.comparison.thisValue")}</p>
            </div>
          </div>
        </section>

        {/* 末尾のCTA。Heroと同じGet Startedを、ページを読み終えた
            タイミングでもう一度置く（別の操作を増やすのではなく同じ
            導線を繰り返すだけなので、1画面1 primary actionの原則
            00-design-principles.md 3.2には反しない）。 */}
        <section className={heroStyles.finalCta}>
          <h2 className={heroStyles.finalCtaTitle}>{t("landing.finalCta.heading")}</h2>
          <Link className={`${heroStyles.cta} ${heroStyles.ctaStatic}`} to="/register">
            {t("auth.getStarted")}
          </Link>
        </section>

      </div>
    </div>
  );
}

export default LandingPage;
