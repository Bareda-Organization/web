앱 상단 바 — 홈은 brand(그린), 설정·상세는 plain을 씁니다.

```jsx
<AppHeader title="바래다" subtitle="3-2호차 · 등원" actions={<IconButton icon="settings" label="설정" tone="inverse" />} />
<AppHeader tone="plain" back onBack={goBack} title="알림 설정" />
```
