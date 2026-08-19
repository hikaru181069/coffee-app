// モバイル専用の下部タブバー（md 未満のみ表示）
// サイドバーナビの代わりにスマホで使いやすい片手操作を実現する。

import { NavLink } from "react-router-dom";
import { BarChart3, Coffee, Home, Share2, User } from "lucide-react";
import { useTranslation } from "react-i18next";

// docs/design.md の Main Navigation（Home / Records / Graph / Stats / Profile）に対応する。
const TABS = [
  { to: "/",        Icon: Home,      labelKey: "nav.home",    end: true },
  { to: "/records", Icon: Coffee,    labelKey: "nav.records"            },
  { to: "/graph",   Icon: Share2,    labelKey: "nav.graph"               },
  { to: "/stats",   Icon: BarChart3, labelKey: "nav.stats"               },
  { to: "/profile", Icon: User,      labelKey: "nav.profile"             },
];

function BottomTabBar() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.bottomNavigation")} className="bottom-tab-bar md:hidden">
      {TABS.map((tab) => {
        const { to, Icon, labelKey, end } = tab;
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `bottom-tab${isActive ? " bottom-tab--active" : ""}`
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span className="bottom-tab-label">{t(labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomTabBar;
