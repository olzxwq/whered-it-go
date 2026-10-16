// Каркас: нижняя панель на телефоне, боковое меню на iPad и ноутбуке.
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { Icon, type IconName } from '../components/Icon';
import { useExpenseSheet } from './ExpenseSheet';
import { useTheme } from './theme';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Главная', icon: 'home' },
  { to: '/expenses', label: 'Расходы', icon: 'list' },
  { to: '/stats', label: 'Статистика', icon: 'chart' },
  { to: '/profile', label: 'Профиль', icon: 'user' },
];

export const APP_NAME = "Where'd It Go";

export function AppShell({ children }: { children: ReactNode }) {
  const { openAdd } = useExpenseSheet();
  const { isDark, toggle } = useTheme();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="wallet" />
          </span>
          <span className="brand-name">{APP_NAME}</span>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end className={(s) => `side-link ${cls(s)}`} title={n.label}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        <button className="side-add" onClick={openAdd} title="Добавить расход">
          <Icon name="plus" />
          <span>Добавить расход</span>
        </button>
        <div className="side-bottom">
          <button className="side-link" style={{ width: '100%' }} onClick={toggle} title="Сменить тему">
            <Icon name={isDark ? 'sun' : 'moon'} />
            <span>{isDark ? 'Светлая тема' : 'Тёмная тема'}</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">{children}</div>
      </main>

      <nav className="tabbar" aria-label="Меню">
        {NAV.slice(0, 2).map((n) => (
          <NavLink key={n.to} to={n.to} end className={(s) => `tab ${cls(s)}`}>
            <span className="tab-icon">
              <Icon name={n.icon} />
            </span>
            {n.label}
          </NavLink>
        ))}
        <button className="tab-add" onClick={openAdd} aria-label="Добавить расход">
          <Icon name="plus" size={26} />
        </button>
        {NAV.slice(2).map((n) => (
          <NavLink key={n.to} to={n.to} end className={(s) => `tab ${cls(s)}`}>
            <span className="tab-icon">
              <Icon name={n.icon} />
            </span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
