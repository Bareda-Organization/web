// Select·SegmentedControl 의 props 안에서 쓰는 배열 원소 타입 — 컴포넌트 파일이 아니라
// types 폴더에 둔다 (`docs/frontend/web/CONVENTIONS_REACT.md` "타입" 절: "props 안에서 쓰는 배열·객체 타입 포함").
// 구조는 같지만 컴포넌트별로 쓰임이 달라 원본 .d.ts 처럼 이름을 분리해 둔다.
export type SelectOption = {
  value: string;
  label: string;
};

export type SegmentedOption = {
  value: string;
  label: string;
};
