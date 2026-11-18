"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../core/Button";
import { EmptyState } from "./EmptyState";

type PanelErrorBoundaryProps = {
  /** 던진 패널 자리에 보일 한 줄 — 무엇을 표시하지 못했는지 쓴다 */
  title: string;
  children: ReactNode;
};

type PanelErrorBoundaryState = { failed: boolean };

// 지도·실시간 띠 같은 패널 하나가 렌더링 중 던져도 그 자리만 대체 문구로 바꾸고 화면의 나머지는 남긴다.
// 라우트 전체를 비우는 `app/error.tsx` 보다 안쪽에서 먼저 받는다. 다시 시도는 자식을 새로 그린다.
export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("패널 렌더링 실패", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        slim
        tone="bad"
        icon="triangle-alert"
        title={this.props.title}
        action={
          <Button variant="secondary" size="sm" onClick={() => this.setState({ failed: false })}>
            다시 시도
          </Button>
        }
      />
    );
  }
}
