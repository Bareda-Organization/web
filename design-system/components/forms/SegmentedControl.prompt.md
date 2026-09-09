2–3개 배타 선택 — 로그인 유저 타입(학생/학부모), 등원/미등원, 등원/하원 노선 전환.

```jsx
<SegmentedControl options={['학생', '학부모']} value={role} onChange={setRole} block />
<SegmentedControl options={['등원', '하원']} value={leg} onChange={setLeg} />
```
