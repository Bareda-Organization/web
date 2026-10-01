type CountableEmergency = { academy: { id: string }; staffAcked: boolean; canceledAt: string | null };

// 학원 id → 그 학원의 미확인 비상 건수. 확인됐거나 취소된 건은 세지 않고, 0건인 학원은 키가 없다.
export const countOpenEmergenciesByAcademy = (items: CountableEmergency[]): Record<string, number> =>
  items.reduce<Record<string, number>>((counts, item) => {
    if (item.staffAcked || item.canceledAt !== null) return counts;
    return { ...counts, [item.academy.id]: (counts[item.academy.id] ?? 0) + 1 };
  }, {});
