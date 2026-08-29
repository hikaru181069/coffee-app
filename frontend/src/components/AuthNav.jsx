import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CoffeeLogo from "./CoffeeLogo";
import LanguageSwitcher from "./LanguageSwitcher";

/**
 * 未ログイン向け3ページ（Landing/Login/Register）共通の軽量ミニナビ。
 *
 * 通常のNavbar（Home/Records/Graph/Stats）は認証必須のページへのリンクの
 * ため、未ログイン者がクリックするとProtectedRouteに弾かれて/landingへ
 * 戻されるだけの壊れた導線になる。App.jsxはこの3ページでは通常のNavbarを
 * 出さず、代わりにこのAuthNavを各ページ自身が表示する。
 *
 * 2026-08、元はLandingPage.jsx内に直書きされていたマークアップを、
 * Login/Registerページの背景装飾グラフ追加とあわせて共通化した。
 *
 * minimal: Login/Register自身では「ログイン」リンクが冗長（Loginページで
 * 「ログイン」を押しても何も起きない）なため、ロゴ+言語切り替えだけに絞る。
 *
 * Landing（デフォルト）は「ログイン」のみ表示し、「はじめましょう」は
 * 出さない。2026-08、ユーザーから「ボタンが多い」という指摘を受けて
 * 見直したところ、ナビの「はじめましょう」はナビ直下のHeroセクションに
 * ある同じ「はじめましょう」CTA（スクロール不要で常に見えている）と
 * 完全に重複していた。一方「ログイン」はページ内で唯一のログイン導線
 * （Hero・How it works・末尾CTAはいずれも「はじめましょう」のみ）
 * のため、これは残す。
 */
function AuthNav({ minimal = false }) {
  const { t } = useTranslation();

  return (
    <nav className="landing-nav">
      <Link to="/landing" className="flex items-center gap-2 text-text">
        <CoffeeLogo size={22} />
        <span className="font-mono text-base font-black tracking-tight">Coffee App</span>
      </Link>
      <div className="landing-nav-actions">
        <LanguageSwitcher />
        {!minimal && (
          <Link to="/login" className="home-link secondary">{t("nav.login")}</Link>
        )}
      </div>
    </nav>
  );
}

export default AuthNav;
