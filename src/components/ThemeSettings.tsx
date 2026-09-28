import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../app/ThemeContext";

const options = [
  { value: "system", label: "시스템 설정", icon: Monitor },
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
] as const;

export function ThemeSettings() {
  const { preference, setPreference } = useTheme();
  return (
    <section className="settings-card">
      <div className="settings-title"><span className="settings-icon"><Sun /></span><div><h2>화면 테마</h2></div></div>
      <fieldset className="theme-options">
        <legend className="visually-hidden">화면 테마</legend>
        {options.map(({ value, label, icon: Icon }) => (
          <label className={`theme-option${preference === value ? " selected" : ""}`} key={value}>
            <input className="theme-option-input" type="radio" name="appearance" value={value} checked={preference === value} onChange={() => setPreference(value)} />
            <Icon size={20} aria-hidden="true" /><span>{label}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
