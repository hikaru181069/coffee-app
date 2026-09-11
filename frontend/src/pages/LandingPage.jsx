import { Fragment } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Coffee, Share2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAuthToken } from "../utils/authStorage";
import AuthNav from "../components/AuthNav";
import GraphIllustration from "./GraphIllustration";
import heroStyles from "./LandingHero.module.css";

// Record → Connect → Discover の3ステップ（docs/vision.md の Core
// Experience）。リンクは持たせない（未ログインで機能ページへ飛んでも
// ProtectedRouteに/landingへ戻されるだけの壊れたループになるため）。
// タイトルは docs/vision.md の英語表記をそのまま使う（Record/Connect/
// Discoverは言語を問わずブランド語として扱う）。
//
// 2026-09、シンプルな1画面構成へ再設計した際、各ステップの説明文
// （1文）を削り、アイコン+ラベルだけのインライン表示にした
// （ユーザーとの相談で決定）。
const HOW_IT_WORKS = [
  { icon: Coffee, title: "Record" },
  { icon: Share2, title: "Connect" },
  { icon: Sparkles, title: "Discover" },
];

function LandingPage() {
  const { t } = useTranslation();
  const token = getAuthToken();
  if (token) return <Navigate to="/" replace />;

  return (
    <div className="landing-page">

      <AuthNav />

      <div className="landing-body">

        {/* ヒーロー: 大きな見出し一文+単語ごとのブラー→フェードイン演出。
            背景には装飾的な知識グラフ（実データではなく固定サンプル、
            GraphIllustration参照）をごく薄く・ゆっくり漂わせる。
            訪問者はまだアプリを使ったことがないため、特定の記録データは
            見せない。CTAはGet Started 1つのみ。
            2026-09、シンプルな1画面構成へ再設計し、Hero以外の独立
            セクション（How it works・Your Knowledge Graph・Why Coffee
            App?・末尾CTA）をすべて削除した。3ステップ（Record →
            Connect → Discover）はアイコン+ラベルだけのインライン表示
            としてHero内に残す（ユーザーとの相談で決定）。 */}
        <section className={heroStyles.hero}>
          <div className={heroStyles.heroGraph}>
            <GraphIllustration />
          </div>
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
          <div className={heroStyles.steps}>
            {HOW_IT_WORKS.map((step, index) => {
              const { icon: Icon, title } = step;
              return (
                <Fragment key={title}>
                  <span className={heroStyles.step}>
                    <span className={heroStyles.stepIcon}>
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className={heroStyles.stepLabel}>{title}</span>
                  </span>
                  {index < HOW_IT_WORKS.length - 1 && (
                    <span className={heroStyles.stepArrow} aria-hidden="true">
                      <ArrowRight size={14} />
                    </span>
                  )}
                </Fragment>
              );
            })}
          </div>
          <Link className={heroStyles.cta} to="/register">{t("auth.getStarted")}</Link>
        </section>

      </div>
    </div>
  );
}

export default LandingPage;
