import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
export default function ThemeControl() {
  const [theme, setTheme] = useState(() => window.formaTheme?.get() || 'system');
  useEffect(() => {
    const update = () => setTheme(window.formaTheme?.get() || 'system');
    window.addEventListener('forma:theme-change', update);
    return () => window.removeEventListener('forma:theme-change', update);
  }, []);
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return (
    <label className="theme-control">
      <Icon size={16} aria-hidden="true" />
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) => window.formaTheme?.set(event.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
