// 左サイドバーナビゲーション。
// デスクトップ (md+): 常に表示される固定サイドバー (w-52 = 208px)
// モバイル (<md): ハンバーガーボタンで左からスライドインするオーバーレイ方式

import { useState } from "react";
import { NavLink } from "react-router-dom";
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

// docs/design.md の Main Navigation（Home / Records / Graph / Profile）に対応する。
// New Record は各画面の「記録する」CTAから遷移するため、ナビ自体には持たせない。
const PRIMARY_ITEMS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  { to: "/records", label: "Records", Icon: RecordsIcon },
  { to: "/graph", label: "Graph", Icon: GraphIcon },
];

// NavLink の isActive に応じてクラスを切り替えるヘルパー関数
const sidebarLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150",
    isActive
      ? "bg-ctp-surface0 text-ctp-blue"
      : "text-ctp-subtext1 hover:bg-ctp-surface0/60 hover:text-ctp-text",
  ].join(" ");

function Navbar() {
  // open: モバイル時のサイドバー開閉状態
  const [open, setOpen] = useState(false);
  const token = getAuthToken();
  const userName = getAuthUserName();

  // ナビリンクをクリックしたらサイドバーを閉じる（モバイル用）
  const close = () => setOpen(false);

  const handleLogout = () => {
    clearAuthData();
    // navigate() ではなく location.href を使う理由:
    // JWT をクリアした後、React のメモリ上に残っている認証状態も
    // 強制的にリセットするためにフルリロードが必要
    window.location.href = "/login";
  };

  // サイドバーの中身（デスクトップとモバイルオーバーレイで共用）
  const sidebarContent = (
    <div className="flex h-full flex-col overflow-y-auto px-3 py-6">
      {/* ロゴ */}
      <NavLink
        to="/"
        onClick={close}
        className="mb-8 flex items-center gap-2.5 px-3 text-ctp-lavender transition-colors duration-150 hover:text-ctp-blue"
      >
        <span className="text-xl" aria-hidden="true">☕</span>
        <span className="text-base font-black tracking-tight">Coffee App</span>
      </NavLink>

      <nav className="flex flex-col gap-0.5">
        {PRIMARY_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={sidebarLinkClass} onClick={close}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 認証エリア（sticky で常に下端に固定） */}
      <div className="sticky bottom-16 md:bottom-0 mt-auto flex flex-col gap-1 border-t border-ctp-surface1/50 bg-ctp-mantle pt-5 pb-2">
        {token ? (
          <>
            <NavLink
              to="/profile"
              onClick={close}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-ctp-surface0 text-ctp-blue"
                    : "text-ctp-subtext0 hover:bg-ctp-surface0/60 hover:text-ctp-text",
                ].join(" ")
              }
            >
              <UserIcon />
              {userName || "Profile"}
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-ctp-subtext1 transition-all duration-150 hover:bg-ctp-red/10 hover:text-ctp-red"
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
              className="flex w-full items-center justify-center rounded-lg border border-ctp-surface2 px-3 py-2 text-sm font-semibold text-ctp-subtext1 transition-all duration-150 hover:border-ctp-sapphire hover:text-ctp-sapphire"
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              onClick={close}
              className="flex w-full items-center justify-center rounded-lg border border-ctp-surface2 px-3 py-2 text-sm font-semibold text-ctp-subtext1 transition-all duration-150 hover:border-ctp-sapphire hover:text-ctp-sapphire"
            >
              Register
            </NavLink>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── モバイル用トップバー (md 未満のみ表示) ── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-ctp-surface1/50 bg-ctp-mantle/85 px-4 backdrop-blur-lg md:hidden">
        {/* ハンバーガーボタン: 3本線 → X への CSS トランスフォームで表現 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-md text-ctp-subtext1 transition-colors hover:bg-ctp-surface0/60"
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
          className="flex items-center gap-2 text-ctp-lavender transition-colors hover:text-ctp-blue"
        >
          <span className="text-lg" aria-hidden="true">☕</span>
          <span className="text-base font-black tracking-tight">Coffee App</span>
        </NavLink>
      </div>

      {/* ── サイドバー本体 ── */}
      {/* translate-x の仕組み:
          - モバイル・閉じた状態: -translate-x-full (画面左外に隠れる)
          - モバイル・開いた状態: translate-x-0 (画面内に表示)
          - デスクトップ: md:translate-x-0 が常に上書きするので常に表示 */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 h-full w-52 border-r border-ctp-surface1/50 bg-ctp-mantle",
          "transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {sidebarContent}
      </aside>

      {/* ── モバイル用バックドロップ（背景を暗くしてクリックで閉じる） ── */}
      <div
        className={[
          "fixed inset-0 z-40 bg-ctp-crust/60 backdrop-blur-sm md:hidden",
          "transition-opacity duration-300",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={close}
      />
    </>
  );
}

export default Navbar;
