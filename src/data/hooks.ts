// «Живые» запросы: экран сам обновляется, когда данные в хранилище меняются.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import * as repo from './repo';

export const useCategories = () => useLiveQuery(repo.listCategories, []);
export const useSources = () => useLiveQuery(repo.listSources, []);
export const useCards = () => useLiveQuery(repo.listCards, []);

/** Словарь id → название, чтобы показывать имена в списках. */
export function useNames() {
  const categories = useCategories();
  const sources = useSources();
  const cards = useCards();
  return useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((c) => map.set(c.id, c.name));
    sources?.forEach((s) => map.set(s.id, s.name));
    cards?.forEach((c) => map.set(c.id, c.name ? `${c.bank} · ${c.name}` : c.bank));
    return (id: string | null) => (id ? map.get(id) ?? '—' : '');
  }, [categories, sources, cards]);
}
