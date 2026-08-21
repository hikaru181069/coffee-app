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
 */
function AuthNav() {
  const { t } = useTranslation();

  return (
    <nav className="landing-nav">
      <Link to="/landing" className="flex items-center gap-2 text-text">
        <CoffeeLogo size={22} />
        <span className="text-base font-black tracking-tight">Coffee App</span>
      </Link>
      <div className="landing-nav-actions">
        <LanguageSwitcher />
        <Link to="/login" className="landing-nav-login">{t("nav.login")}</Link>
        <Link to="/register" className="home-link">{t("auth.getStarted")}</Link>
      </div>
    </nav>
  );
}

export default AuthNav;
