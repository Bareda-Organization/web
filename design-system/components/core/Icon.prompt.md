Lucide 아이콘을 currentColor로 렌더하는 래퍼 — 바래다의 모든 아이콘은 이걸 통해 씁니다.

```jsx
<Icon name="bus" size={24} />
<span style={{ color: 'var(--status-missed)' }}><Icon name="triangle-alert" /></span>
```

자주 쓰는 이름: bus, map-pin, route, bell, bell-off, users-round, user-round, clock, phone,
check, x, chevron-right, chevron-down, search, settings, plus, pencil, trash-2, triangle-alert,
circle-check, circle-alert, navigation, calendar, list, layout-dashboard, log-out.
색은 부모의 color를 상속합니다 — fill/stroke를 직접 넘기지 마세요.
