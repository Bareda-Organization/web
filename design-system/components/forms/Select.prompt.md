드롭다운 — 호차 선택, 등원 여부, 반 선택 등.

```jsx
<Select label="등원 상태" options={['등원', '미등원']} />
<Select label="호차" options={[{ value: '3-2', label: '3-2호차' }, { value: '3-3', label: '3-3호차' }]} />
```

5분 단위 지연 시간처럼 선택지가 정해진 값은 DelayPicker를 쓰세요.
