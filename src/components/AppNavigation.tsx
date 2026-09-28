import { Home, Library, Music2, Plus, UserRound } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { cn } from "../lib/utils";
import { useProfile } from "../features/profile/ProfileContext";
import { Avatar } from "./ui/Avatar";

const items = [
  { to: "/", label: "홈", icon: Home, end: true },
  { to: "/onochoo", label: "오노추", icon: Music2 },
  { to: "/mutigoeul", label: "무티고을", icon: Library },
  { to: "/settings", label: "내 정보", icon: UserRound },
];

export function AppNavigation({ onAdd }: { onAdd: () => void }) {
  const { profile } = useProfile();
  return (
    <>
      <nav className="sidebar" aria-label="주요 메뉴">
        <Link to="/" className="sidebar-brand" aria-label="오노추 홈"><span>ohnochoo<span className="brand-period">.</span></span></Link>
        <span className="sidebar-label">우리의 음악 공간</span>
        <div className="sidebar-links">
          {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("nav-link", isActive && "active")}><Icon /><span>{label}</span></NavLink>)}
        </div>
        <button className="primary-button sidebar-add" onClick={onAdd}><Plus size={19} /> 노래 추가</button>
        {profile ? <Link className="sidebar-profile" to="/settings"><Avatar name={profile.name} imageUrl={profile.avatar_url} imageVersion={profile.avatar_updated_at} size="sm" /><span><b>{profile.name}</b><small>내 프로필</small></span></Link> : null}
      </nav>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("bottom-link", isActive && "active")}><Icon /><span>{label}</span></NavLink>)}
      </nav>
    </>
  );
}
