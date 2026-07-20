import { Home, Library, Music2, Plus, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../lib/utils";

const items = [
  { to: "/", label: "홈", icon: Home, end: true },
  { to: "/onochoo", label: "오노추", icon: Music2 },
  { to: "/mutigoeul", label: "무티고을", icon: Library },
  { to: "/settings", label: "내 정보", icon: UserRound },
];

export function AppNavigation({ onAdd }: { onAdd: () => void }) {
  return (
    <>
      <nav className="sidebar" aria-label="주요 메뉴">
        <div className="sidebar-brand"><span className="brand-mark">O</span><span>ohnochoo</span></div>
        <div className="sidebar-links">
          {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("nav-link", isActive && "active")}><Icon /><span>{label}</span></NavLink>)}
        </div>
        <button className="primary-button sidebar-add" onClick={onAdd}><Plus size={19} /> 노래 추가</button>
        <p className="sidebar-note">우리끼리 듣고, 고르고,<br />함께 만든 플레이리스트.</p>
      </nav>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {items.slice(0, 2).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("bottom-link", isActive && "active")}><Icon /><span>{label}</span></NavLink>)}
        <button className="nav-add" onClick={onAdd} aria-label="노래 추가"><Plus /></button>
        {items.slice(2).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => cn("bottom-link", isActive && "active")}><Icon /><span>{label}</span></NavLink>)}
      </nav>
    </>
  );
}
