// Постоянные id у стандартных категорий и источников: если начать пользоваться
// сайтом на двух устройствах независимо, после синхронизации они не задвоятся.

export const DEFAULT_CATEGORIES: { id: string; name: string }[] = [
  { id: 'cat-products', name: 'Продукты' },
  { id: 'cat-cafe', name: 'Кафе и доставка' },
  { id: 'cat-transport', name: 'Транспорт' },
  { id: 'cat-study', name: 'Учёба' },
  { id: 'cat-clothes', name: 'Одежда и обувь' },
  { id: 'cat-beauty', name: 'Красота и уход' },
  { id: 'cat-health', name: 'Здоровье' },
  { id: 'cat-fun', name: 'Развлечения' },
  { id: 'cat-subscriptions', name: 'Связь и подписки' },
  { id: 'cat-gifts', name: 'Подарки' },
  { id: 'cat-other', name: 'Другое' },
];

export const SUGGESTED_SOURCES: { id: string; name: string }[] = [
  { id: 'src-stipend', name: 'Стипендия' },
  { id: 'src-salary', name: 'Зарплата' },
  { id: 'src-parents', name: 'Родители' },
];
