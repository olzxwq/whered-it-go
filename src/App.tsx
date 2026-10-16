import { useLiveQuery } from 'dexie-react-hooks';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './app/AppShell';
import { ExpenseSheetProvider } from './app/ExpenseSheet';
import * as repo from './data/repo';
import { Expenses } from './pages/Expenses';
import { Home } from './pages/Home';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { Stats } from './pages/Stats';

export function App() {
  const onboarded = useLiveQuery(repo.isOnboarded, []);
  if (onboarded === undefined) return null; // читаем хранилище
  if (!onboarded) return <Onboarding />;

  // HashRouter: адреса вида /#/expenses — работают на GitHub Pages без настройки сервера
  return (
    <HashRouter>
      <ExpenseSheetProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </ExpenseSheetProvider>
    </HashRouter>
  );
}
