관계자 웹 전용 표 — 헤더는 미스트 배경, 행 구분은 1px 선만.

```jsx
<RosterTable onRowClick={open} rows={students} columns={[
  { key: 'name', label: '이름', width: 120 },
  { key: 'stop', label: '정류장' },
  { key: 'status', label: '탑승 현황', render: r => <StatusPill status={r.status} /> },
  { key: 'change', label: '금일 변경', render: r => r.added ? <Badge tone="added">추가</Badge> : null },
]} />
```

금일 추가된 탑승자는 Badge tone="added"(초록), 삭제된 탑승자는 "removed"(빨강)로 표시합니다.
