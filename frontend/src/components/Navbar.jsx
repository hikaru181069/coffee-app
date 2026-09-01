// ナビゲーション。
// デスクトップ (md+): 上部の横並びナビバー (h-14)
// モバイル (<md): ハンバーガーボタンで左からスライドインするオーバーレイ方式
//
// 2026-08、デスクトップは左サイドバー(w-52固定)から上部ナビバーへ置き換えた
// （ユーザーと相談して決定）。ナビ項目がHome/Records/Graph/Statsの4つと
// 少なく、常時208px分の横幅を専有するサイドバーほどの必然性が無いと判断
// したため。モバイルのハンバーガー+ドロワー方式はそのまま変更していない。

import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HouseIcon, ChartNetworkIcon, CoffeeIcon, ChartBarIcon, UserIcon, LogOutIcon } from "@animateicons/react/lucide";
import CoffeeLogo from "./CoffeeLogo";
import { clearAuthData, getAuthToken, getAuthUserName } from "../utils/authStorage";
import { useFocusTrap } from "../hooks/useFocusTrap";

// 2026-08、以前はlucide-reactも使わず必要な分だけSVGを自前で書いていたが、
// ホバーで動くアイコン（mobbin.comで見た体験の再現）を導入するため
// @animateicons/react（MIT、Lucideベースのアイコンをホバーアニメーション
// 付きで提供するライブラリ）へ置き換えた。stroke="currentColor" /
// viewBox="0 0 24 24" / strokeWidth="2"など、以前の自前SVGと同じ規約で
// 実装されているため、既存のnavLinkClass（色の継承）はそのまま使える。
//
// 各アイコンはデフォルトで「アイコンの絵柄自体にカーソルが乗った時」だけ
// 発火するが、ナビ項目はNavLink全体が一つのホバー領域として見える
// （hover:bg-surface-1/60）ため、アイコンだけに当たり判定を絞ると不自然。
// refを渡すと内蔵の自動ホバー検知が無効化され、startAnimation() /
// stopAnimation()を外から呼ぶ方式に切り替わる仕様を利用し、NavLink/button
// 側のonMouseEnter・onMouseLeaveから発火させている（NavIconLink /
// NavIconButton）。

// docs/design.md の Main Navigation（Home / Records / Graph / Stats / Profile）に対応する。
// New Record は各画面の「記録する」CTAから遷移するため、ナビ自体には持たせない。
// labelKeyはi18nのnav.*キー。PRIMARY_ITEMSはモジュールスコープの定数で
// useTranslation()を呼べないため、表示直前（NavIconLink内）でt()に通す。
const PRIMARY_ITEMS = [
  { to: "/", labelKey: "nav.home", Icon: HouseIcon, end: true },
  { to: "/records", labelKey: "nav.records", Icon: CoffeeIcon },
  { to: "/graph", labelKey: "nav.graph", Icon: ChartNetworkIcon },
  { to: "/stats", labelKey: "nav.stats", Icon: ChartBarIcon },
];

// NavLink の isActive に応じてクラスを切り替えるヘルパー関数。
// モバイルのドロワーとデスクトップの上部ナビバー、両方の縦/横並びで
// 見た目を揃えるために共用する
const navLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-150",
    isActive
      ? "bg-surface-2 text-text"
      : "text-text-secondary hover:bg-surface-1/60 hover:text-text",
  ].join(" ");

// ナビ項目全体（アイコン+テキスト）のホバーでアイコンアニメーションを
// 発火させるためのラッパー。個別にrefを持つ必要があるため、PRIMARY_ITEMSの
// map内では呼べず（Rules of Hooks）、小さなコンポーネントとして切り出した
// label: そのまま表示する文字列（ユーザー名など、翻訳不要なもの）
// labelKey: i18nのキー。両方渡された場合はlabelを優先する
function NavIconLink(props) {
  const { to, end, label, labelKey, Icon, onClick } = props;
  const { t } = useTranslation();
  const iconRef = useRef(null);
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={navLinkClass}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <Icon ref={iconRef} size={16} />
      {label ?? t(labelKey)}
    </NavLink>
  );
}

// Logoutボタン用。NavIconLinkと役割は同じだがNavLinkではなくbuttonのため分ける
function NavIconButton(props) {
  const { onClick, className, Icon, children } = props;
  const iconRef = useRef(null);
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <Icon ref={iconRef} size={16} />
      {children}
    </button>
  );
}

function Navbar() {
  const { t } = useTranslation();
  // open: モバイル時のドロワー開閉状態（デスクトップの上部ナビバーは常に表示なので使わない）
  const [open, setOpen] = useState(false);
  const token = getAuthToken();
  const userName = getAuthUserName();
  const drawerRef = useRef(null);

  // ナビリンクをクリックしたらドロワーを閉じる（モバイル用）
  const close = () => setOpen(false);

  // 2026-08、監査で発覚: Escapeで閉じる・開いたらフォーカスを移す・
  // Tabをドロワー内で循環させる、のどれも無かった（ConfirmDialog.jsxには
  // あった）。hooks/useFocusTrap.jsへ共通化したものをここでも使う
  useFocusTrap(drawerRef, open, close);

  const handleLogout = () => {
    clearAuthData();
    // navigate() ではなく location.href を使う理由:
    // JWT をクリアした後、React のメモリ上に残っている認証状態も
    // 強制的にリセットするためにフルリロードが必要
    window.location.href = "/login";
  };

  return (
    <>
      {/* ── モバイル用トップバー (md 未満のみ表示) ── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-surface-2/50 bg-raised/85 px-4 backdrop-blur-lg md:hidden">
        {/* ハンバーガーボタン: 3本線 → X への CSS トランスフォームで表現 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("nav.toggleMenu")}
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md text-text-secondary transition-colors hover:bg-surface-1/60"
        >
          <span
            className={`block h-0.5 w-5 bg-current transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-current transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
        <NavLink
          to="/"
          onClick={close}
          className="flex items-center gap-2 text-text transition-colors hover:text-text-secondary"
        >
          <CoffeeLogo size={22} />
          <span className="font-mono text-base font-black tracking-tight text-inverse">Coffee App</span>
        </NavLink>
      </div>

      {/* ── モバイル用ドロワー本体 (md未満のみ。デスクトップでは常に非表示) ── */}
      {/* translate-x の仕組み:
          - 閉じた状態: -translate-x-full (画面左外に隠れる)
          - 開いた状態: translate-x-0 (画面内に表示) */}
      <aside
        id="mobile-nav-drawer"
        ref={drawerRef}
        // 閉じている間（-translate-x-fullで画面外）もDOMには残り続けるため、
        // inertでフォーカス・クリック・スクリーンリーダーへの露出を丸ごと
        // 無効化する。これが無いと、閉じたままキーボードでTabしていくと
        // 画面外の非表示リンクへフォーカスが飛んでしまっていた（2026-08、監査で発覚）
        inert={!open}
        className={[
          "fixed left-0 top-0 z-50 h-full w-52 border-r border-surface-2/50 bg-raised md:hidden",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-y-auto px-3 py-6">
          {/* ロゴ */}
          <NavLink
            to="/"
            onClick={close}
            className="mb-8 flex items-center gap-2.5 px-3 text-text transition-colors duration-150 hover:text-text-secondary"
          >
            <CoffeeLogo size={24} />
            <span className="font-mono text-base font-black tracking-tight text-inverse">Coffee App</span>
          </NavLink>

          <nav aria-label={t("nav.mainNavigation")} className="flex flex-col gap-0.5">
            {PRIMARY_ITEMS.map((item) => (
              <NavIconLink key={item.to} {...item} onClick={close} />
            ))}
          </nav>

          {/* 認証エリア（sticky で常に下端に固定） */}
          <div className="sticky bottom-16 mt-auto flex flex-col gap-1 border-t border-surface-2/50 bg-raised pt-5 pb-2">
            {token ? (
              <>
                <NavIconLink to="/profile" Icon={UserIcon} label={userName || t("nav.profile")} onClick={close} />
                <NavIconButton
                  onClick={handleLogout}
                  Icon={LogOutIcon}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger"
                >
                  {t("nav.logout")}
                </NavIconButton>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={close}
                  className="flex w-full items-center justify-center rounded-lg border border-surface-3 px-3 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-line-strong hover:text-text"
                >
                  {t("nav.login")}
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={close}
                  className="flex w-full items-center justify-center rounded-lg border border-surface-3 px-3 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-line-strong hover:text-text"
                >
                  {t("nav.register")}
                </NavLink>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── モバイル用バックドロップ（背景を暗くしてクリックで閉じる） ──
          マウス操作の補助であり、ドロワーを閉じる正規の手段は上の
          ハンバーガーボタン（キーボードでも操作可能）なので、
          スクリーンリーダー・キーボード操作からは隠す */}
      <div
        aria-hidden="true"
        className={[
          "fixed inset-0 z-40 bg-base/60 backdrop-blur-sm md:hidden",
          "transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={close}
      />

      {/* ── デスクトップ用 上部ナビバー (md 以上のみ表示) ── */}
      <div className="fixed inset-x-0 top-0 z-50 hidden h-14 items-center gap-6 border-b border-surface-2/50 bg-raised/85 px-6 backdrop-blur-lg md:flex">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-text transition-colors duration-150 hover:text-text-secondary"
        >
          <CoffeeLogo size={22} />
          <span className="font-mono text-base font-black tracking-tight text-inverse">Coffee App</span>
        </NavLink>

        <nav aria-label={t("nav.mainNavigation")} className="flex items-center gap-1">
          {PRIMARY_ITEMS.map((item) => (
            <NavIconLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {token ? (
            <>
              <NavIconLink to="/profile" Icon={UserIcon} label={userName || t("nav.profile")} />
              <NavIconButton
                onClick={handleLogout}
                Icon={LogOutIcon}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger"
              >
                {t("nav.logout")}
              </NavIconButton>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="flex items-center justify-center rounded-lg border border-surface-3 px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-line-strong hover:text-text"
              >
                {t("nav.login")}
              </NavLink>
              <NavLink
                to="/register"
                className="flex items-center justify-center rounded-lg border border-surface-3 px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-line-strong hover:text-text"
              >
                {t("nav.register")}
              </NavLink>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;
