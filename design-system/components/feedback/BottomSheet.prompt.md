지도 위에서 정보를 겹쳐 보여줄 때 — 실시간 위치 화면의 운행 요약, 정류장 상세.

```jsx
<BottomSheet title="3-2호차 · 등원" onClose={close}>
  <StopTimeline stops={stops} />
</BottomSheet>
```

반경은 상단만 24. 지도 화면에서 유일하게 --shadow-sheet를 쓰는 곳입니다.
