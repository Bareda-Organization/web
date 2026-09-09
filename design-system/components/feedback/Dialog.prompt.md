확정이 필요한 행동에만 — 삭제, 강제 추가, 지연 알림 전송 확인.

```jsx
<Dialog title="학생 정보를 삭제할까요?" onClose={close}
  footer={<><Button variant="ghost" onClick={close}>취소</Button><Button variant="danger">삭제</Button></>}>
  김하준 학생의 탑승 정보와 보호자 코드가 함께 삭제됩니다.
</Dialog>
```

부모가 자리를 잡는 부모 요소에 position:relative를 주세요.
