// モバイル専用の下部タブバー（md 未満のみ表示）
// サイドバーナビの代わりにスマホで使いやすい片手操作を実現する。

import { NavLink } from "react-router-dom";
import { BarChart3, Coffee, Home, Share2, User } from "lucide-react";
import { useTranslation } from "react-i18next";

// docs/design.md の Main Navigation（Home / Records / Graph / Stats / Profile）に対応する。
const TABS = [
  { to: "/",        Icon: Home,      label: "Home",    end: true },
  { to: "/records", Icon: Coffee,    label: "Records"            },
  { to: "/graph",   Icon: Share2,    label: "Graph"               },
  { to: "/stats",   Icon: BarChart3, label: "Stats"               },
  { to: "/profile", Icon: User,      label: "Profile"             },
];

function BottomTabBar() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.bottomNavigation")} className="bottom-tab-bar md:hidden">
      {TABS.map((tab) => {
        const { to, Icon, label, end } = tab;
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
            <span className="bottom-tab-label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default BottomTabBar;
