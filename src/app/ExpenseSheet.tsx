// Панель добавления/исправления расхода доступна с любого экрана:
// кнопка «＋» в меню и нажатие на расход в списке открывают её через этот контекст.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Expense } from '../data/db';
import { ExpenseForm } from '../components/ExpenseForm';
import { Sheet } from '../components/Sheet';

interface ExpenseSheetApi {
  openAdd: () => void;
  openEdit: (e: Expense) => void;
}

const Ctx = createContext<ExpenseSheetApi | null>(null);

type State = { mode: 'add' } | { mode: 'edit'; expense: Expense } | null;

export function ExpenseSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const close = useCallback(() => setState(null), []);
  const api = useMemo<ExpenseSheetApi>(
    () => ({
      openAdd: () => setState({ mode: 'add' }),
      openEdit: (expense) => setState({ mode: 'edit', expense }),
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {state && (
        <Sheet title={state.mode === 'add' ? 'Новый расход' : 'Исправить расход'} onClose={close}>
          <ExpenseForm expense={state.mode === 'edit' ? state.expense : undefined} onDone={close} />
        </Sheet>
      )}
    </Ctx.Provider>
  );
}

export function useExpenseSheet(): ExpenseSheetApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useExpenseSheet вне ExpenseSheetProvider');
  return ctx;
}
