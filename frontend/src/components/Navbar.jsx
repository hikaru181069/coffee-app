// [Phase 6] 左サイドバーナビゲーション
// fantinel.dev を参考に、トップバーから左固定サイドバーへリデザイン。
// デスクトップ (md+): 常に表示される固定サイドバー (w-52 = 208px)
// モバイル (<md): ハンバーガーボタンで左からスライドインするオーバーレイ方式

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  clearAuthData,
  getAuthToken,
  getAuthUserName,
} from "../utils/authStorage";
import { getCurrentUser } from "../services/api/userApi";

// ── Inline SVG icons ──────────────────────────────────────────────────────────
// アイコンライブラリを入れずに済むよう、必要な分だけ SVG を直書きする。
// viewBox="0 0 24 24" は Heroicons などの標準的なグリッドサイズ。
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
const DiscoverIcon = () => (
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
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
// coffee-app の Records 用。コーヒーカップ
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
const SearchIcon = () => (
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
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
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
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const CompareIcon = () => (
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
    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);
const MatchupIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const ScoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="3" />
    <path d="M11 2a9 9 0 100 18A9 9 0 0011 2z" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const ProspectsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const PositionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const LeagueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z" />
  </svg>
);
const NewsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z" />
  </svg>
);
// お気に入りチーム（My Team）用の盾アイコン
const TeamIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5z" />
  </svg>
);
const StarIcon = () => (
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
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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

// ── Nav items ─────────────────────────────────────────────────────────────────
// 「発見」が主役のアプリであることをナビの見た目にも反映する。
// Home/Discover/Favoritesは常に目立つ主役グループ、それ以外(Stats/News等の
// 情報閲覧系機能)は「Tools」の下にまとめ、視覚的に控えめにする
// (vision.mdの「検索するものではなく発見するもの」という方針に合わせる)。
const PRIMARY_ITEMS = [
  { to: "/", label: "Home", Icon: HomeIcon, end: true },
  // coffee-app の記録一覧。URLを直接打たずに到達できるようにする。
  // ナビ全体の再構成（docs/design.md の Home/Records/New Record/Graph/Profile）は
  // 画面が出そろう Phase 6 で行う
  { to: "/records", label: "Records", Icon: RecordsIcon },
  { to: "/discover", label: "Discover", Icon: DiscoverIcon },
];

const TOOL_ITEMS = [
  { to: "/search", label: "Search", Icon: SearchIcon },
  { to: "/scout", label: "Scout", Icon: ScoutIcon },
  { to: "/compare", label: "Compare", Icon: CompareIcon },
  { to: "/matchup", label: "Matchup", Icon: MatchupIcon },
  { to: "/stats", label: "Stats", Icon: StatsIcon },
  { to: "/league", label: "League", Icon: LeagueIcon },
  { to: "/news", label: "News", Icon: NewsIcon },
  { to: "/positions", label: "Positions", Icon: PositionsIcon },
  { to: "/prospects", label: "Prospects", Icon: ProspectsIcon },
];

// NavLink の isActive に応じてクラスを切り替えるヘルパー関数
// React Router の NavLink は className に関数を渡せる
const sidebarLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150",
    isActive
      ? "bg-ctp-surface0 text-ctp-blue"
      : "text-ctp-subtext1 hover:bg-ctp-surface0/60 hover:text-ctp-text",
  ].join(" ");

// 脇役(Tools)側は主役より一回り小さく・控えめな色にする
const toolLinkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150",
    isActive
      ? "bg-ctp-surface0 text-ctp-blue"
      : "text-ctp-subtext0 hover:bg-ctp-surface0/60 hover:text-ctp-text",
  ].join(" ");

// ── Component ─────────────────────────────────────────────────────────────────
function Navbar() {
  // open: モバイル時のサイドバー開閉状態
  const [open, setOpen] = useState(false);
  const token = getAuthToken();
  const userName = getAuthUserName();

  // ログイン中はお気に入りチームを取得し、"My Team" リンクを出す。
  // favoriteTeam は localStorage に無く User ドキュメント側にあるため API で取得する。
  const [favoriteTeam, setFavoriteTeam] = useState(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const fetchFavoriteTeam = async () => {
      try {
        const user = await getCurrentUser(token);
        if (active) setFavoriteTeam(user.favoriteTeam ?? null);
      } catch {
        // ナビは補助的なので失敗しても黙って無視する（リンクを出さないだけ）
        if (active) setFavoriteTeam(null);
      }
    };
    fetchFavoriteTeam();
    return () => {
      active = false;
    };
  }, [token]);

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
        <img
          src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg"
          alt="MLB"
          className="h-7 w-7 flex-shrink-0"
        />
        <span className="text-base font-black tracking-tight">MLB App</span>
      </NavLink>

      {/* ナビリンク: 主役(Home/Discover/Favorites)を大きく、Toolsを控えめに */}
      <nav className="flex flex-col gap-0.5">
        {PRIMARY_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={sidebarLinkClass}
            onClick={close}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
        {token && (
          <NavLink to="/favorites" className={sidebarLinkClass} onClick={close}>
            <StarIcon />
            Favorites
          </NavLink>
        )}

        <p className="mb-1 mt-5 px-3 text-[11px] font-bold uppercase tracking-wider text-ctp-subtext0/70">
          Tools
        </p>
        {TOOL_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={toolLinkClass}
            onClick={close}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
        {token && favoriteTeam?.id && (
          <NavLink
            to={`/team/${favoriteTeam.id}`}
            className={toolLinkClass}
            onClick={close}
          >
            <TeamIcon />
            My Team
          </NavLink>
        )}
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
      {/* デスクトップではサイドバーがあるのでトップバーは不要 */}
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
          <img
            src="https://www.mlbstatic.com/team-logos/league-on-dark/1.svg"
            alt="MLB"
            className="h-6 w-6"
          />
          <span className="text-base font-black tracking-tight">MLB App</span>
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
      {/* pointer-events-none/auto でクリック判定を on/off する
          opacity で表示/非表示を切り替え（display:none と違いアニメーションが効く） */}
      <div
        className={[
          "fixed inset-0 z-40 bg-ctp-crust/60 backdrop-blur-sm md:hidden",
          "transition-opacity duration-300",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={close}
      />
    </>
  );
}

export default Navbar;
