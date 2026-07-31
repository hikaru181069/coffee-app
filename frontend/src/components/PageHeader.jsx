// 共通のスリムなアプリ型ページヘッダー
// Team / League / Stats などで共有する。
//
// props（すべて任意。渡したものだけ表示される）:
//   backTo      : 戻り先パス（指定すると「← backLabel」を表示）
//   kicker      : 右上の小ラベル（例: "2026 Season"）
//   logo        : 左のロゴ画像URL（例: 球団ロゴ）
//   title       : 見出し
//   subtitle    : 補足行（例: 地区・球場）
//   right       : 右側に出す任意のノード（例: 成績）
//   tabs        : [{ key, label }] を渡すと sticky タブを表示
//   activeTab / onTabChange : タブの状態と切り替え

import { Link } from "react-router-dom";

function PageHeader({
  backTo,
  backLabel = "Back",
  kicker,
  logo,
  title,
  subtitle,
  right,
  tabs,
  activeTab,
  onTabChange,
}) {
  return (
    <header className="page-header">
      {(backTo || kicker) && (
        <div className="page-header-top">
          {backTo ? (
            <Link className="page-header-back" to={backTo}>
              ← {backLabel}
            </Link>
          ) : (
            <span />
          )}
          {kicker && <span className="page-header-kicker">{kicker}</span>}
        </div>
      )}

      <div className="page-header-main">
        {logo && (
          <img
            className="page-header-logo"
            src={logo}
            alt=""
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <div className="page-header-info">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
        {right && <div className="page-header-right">{right}</div>}
      </div>

      {tabs && tabs.length > 0 && (
        <div className="page-header-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`page-tab ${activeTab === tab.key ? "page-tab--active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
