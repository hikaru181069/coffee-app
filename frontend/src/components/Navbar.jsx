// ナビゲーション。
// デスクトップ (md+): 上部の横並びナビバー (h-14)
// モバイル (<md): ハンバーガーボタンで左からスライドインするオーバーレイ方式
//
// 2026-08、デスクトップは左サイドバー(w-52固定)から上部ナビバーへ置き換えた
// （ユーザーと相談して決定）。ナビ項目がHome/Records/Graph/Statsの4つと
// 少なく、常時208px分の横幅を専有するサイドバーほどの必然性が無いと判断
// したため。モバイルのハンバーガー+ドロワー方式はそのまま変更していない。

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clearAuthData, getAuthToken, getAuthUserName } from "../utils/authStorage";

// ── Inline SVG icons ──────────────────────────────────────────────────────────
// アイコンライブラリ(lucide-react)もあるが、既存のこの構成に合わせて
// 必要な分だけ SVG を直書きする。viewBox="0 0 24 24" は標準的なグリッドサイズ。
const HomeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
// Graph用。つながりを示すノード+線
const GraphIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="12" cy="18" r="3" />
    <line x1="8.5" y1="7.5" x2="10" y2="15.5" />
    <line x1="15.5" y1="7.5" x2="14" y2="15.5" />
  </svg>
);
// Records用。コーヒーカップ
const RecordsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 8h1a4 4 0 010 8h-1" />
    <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </svg>
);
// Stats用。棒グラフ
const StatsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="6" y1="20" x2="6" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="18" y1="20" x2="18" y2="14" />
  </svg>
);
const UserIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const LogoutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// docs/design.md の Main Navigation（Home / Records / Graph / Stats / Profile）に対応する。
// New Record は各画面の「記録する」CTAから遷移するため、ナビ自体には持たせない。
const PRIMARY_ITEMS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/records", label: "Records", Icon: RecordsIcon },
  { to: "/graph", label: "Graph", Icon: GraphIcon },
  { to: "/stats", label: "Stats", Icon: StatsIcon },
];

// NavLink の isActive に応じてクラスを切り替えるヘルパー関数。
// モバイルのドロワーとデスクトップの上部ナビバー、両方の縦/横並びで
// 見た目を揃えるために共用する
const navLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-150",
    isActive
      ? "bg-surface-1 text-primary"
      : "text-text-secondary hover:bg-surface-1/60 hover:text-text",
  ].join(" ");

function Navbar() {
  const { t } = useTranslation();
  // open: モバイル時のドロワー開閉状態（デスクトップの上部ナビバーは常に表示なので使わない）
  const [open, setOpen] = useState(false);
  const token = getAuthToken();
  const userName = getAuthUserName();

  // ナビリンクをクリックしたらドロワーを閉じる（モバイル用）
  const close = () => setOpen(false);

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
          aria-label="Toggle menu"
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
          className="flex items-center gap-2 text-primary transition-colors hover:text-primary"
        >
          <span className="text-base font-black tracking-tight">Coffee App</span>
        </NavLink>
      </div>

      {/* ── モバイル用ドロワー本体 (md未満のみ。デスクトップでは常に非表示) ── */}
      {/* translate-x の仕組み:
          - 閉じた状態: -translate-x-full (画面左外に隠れる)
          - 開いた状態: translate-x-0 (画面内に表示) */}
      <aside
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
            className="mb-8 flex items-center gap-2.5 px-3 text-primary transition-colors duration-150 hover:text-primary"
          >
            <span className="text-base font-black tracking-tight">Coffee App</span>
          </NavLink>

          <nav aria-label={t("nav.mainNavigation")} className="flex flex-col gap-0.5">
            {PRIMARY_ITEMS.map((item) => {
              const { to, label, Icon, end } = item;
              return (
                <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={close}>
                  <Icon />
                  {label}
                </NavLink>
              );
            })}
          </nav>

          {/* 認証エリア（sticky で常に下端に固定） */}
          <div className="sticky bottom-16 mt-auto flex flex-col gap-1 border-t border-surface-2/50 bg-raised pt-5 pb-2">
            {token ? (
              <>
                <NavLink to="/profile" onClick={close} className={navLinkClass}>
                  <UserIcon />
                  {userName || "Profile"}
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger"
                >
                  <LogoutIcon />
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={close}
                  className="flex w-full items-center justify-center rounded-lg border border-surface-3 px-3 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-primary hover:text-primary"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={close}
                  className="flex w-full items-center justify-center rounded-lg border border-surface-3 px-3 py-2 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-primary hover:text-primary"
                >
                  Register
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
          className="flex items-center gap-2 text-primary transition-colors duration-150 hover:text-primary"
        >
          <span className="text-base font-black tracking-tight">Coffee App</span>
        </NavLink>

        <nav aria-label={t("nav.mainNavigation")} className="flex items-center gap-1">
          {PRIMARY_ITEMS.map((item) => {
            const { to, label, Icon, end } = item;
            return (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                <Icon />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {token ? (
            <>
              <NavLink to="/profile" className={navLinkClass}>
                <UserIcon />
                {userName || "Profile"}
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-150 hover:bg-danger/10 hover:text-danger"
              >
                <LogoutIcon />
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="flex items-center justify-center rounded-lg border border-surface-3 px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-primary hover:text-primary"
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="flex items-center justify-center rounded-lg border border-surface-3 px-3 py-1.5 text-sm font-semibold text-text-secondary transition-all duration-150 hover:border-primary hover:text-primary"
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;
