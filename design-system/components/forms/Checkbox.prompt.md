다중 선택 — 정류장 순회 체크, 일괄 탑승 대상 선택.

```jsx
<Checkbox checked={on} onChange={e => setOn(e.target.checked)} label="김하준" sublabel="한화아파트 · 3학년" />
```

탑승/하차 상태 전환은 체크박스가 아니라 StudentRow의 상태 버튼을 씁니다.
