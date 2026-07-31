// モバイル専用の下部タブバー（md 未満のみ表示）
// サイドバーナビの代わりにスマホで使いやすい片手操作を実現する。

import { NavLink } from "react-router-dom";
import { Home, Sparkles, Trophy, Star, User } from "lucide-react";

const TABS = [
  { to: "/",          Icon: Home,      label: "Home",    end: true },
  { to: "/discover",  Icon: Sparkles,  label: "Discover"           },
  { to: "/favorites", Icon: Star,      label: "Favorites"          },
  { to: "/league",    Icon: Trophy,    label: "League"             },
  { to: "/profile",   Icon: User,      label: "Profile"            },
];

function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar md:hidden">
      {TABS.map(({ to, Icon, label, end }) => (
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
      ))}
    </nav>
  );
}

export default BottomTabBar;
