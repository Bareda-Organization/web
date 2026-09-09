앱 하단 탭 — 학부모·학생 앱 4탭, 매니저 앱 3탭.

```jsx
<TabBar value={tab} onChange={setTab} items={[
  { value: 'home', label: '홈', icon: 'house' },
  { value: 'map', label: '실시간', icon: 'map-pin' },
  { value: 'alerts', label: '알림', icon: 'bell', badge: 2 },
  { value: 'settings', label: '설정', icon: 'settings' },
]} />
```
