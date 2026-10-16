// Тема: «как в системе», светлая или тёмная. Выбор хранится только на этом устройстве.
// Контекст нужен, чтобы все переключатели на странице знали одно и то же состояние.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

interface ThemeState {
  choice: ThemeChoice;
  setChoice: (c: ThemeChoice) => void;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system'; // в приватном режиме localStorage может быть недоступен
  }
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);
  const isDark = choice === 'dark' || (choice === 'system' && systemDark);

  // Следим за сменой темы в системе (например, автоматической вечером)
  useEffect(() => {
    const mq = darkQuery();
    const update = () => setSystemDark(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') delete root.dataset.theme;
    else root.dataset.theme = choice;
    // Цвет полосы состояния браузера и iPhone
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#06231D' : '#F4F6EF');
    try {
      if (choice === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', choice);
    } catch {
      /* не страшно: тема просто не запомнится */
    }
  }, [choice, isDark]);

  const toggle = () => setChoice(isDark ? 'light' : 'dark');
  return <ThemeContext.Provider value={{ choice, setChoice, isDark, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme вне ThemeProvider');
  return ctx;
}
