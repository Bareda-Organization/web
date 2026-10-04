import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "../core/Button";
import {
  StyledDrawerOverlay,
  StyledDrawerPanel,
  StyledDrawerHeader,
  StyledDrawerTitle,
  StyledDrawerBody,
  StyledDrawerFooter,
} from "./Drawer.styled";
import { useModalPanel } from "./useModalPanel";

export type DrawerProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  title?: string;
  /** 아래 고정 버튼 영역. 취소·거절은 왼쪽, 주 동작(승인·저장)은 오른쪽 끝 */
  footer?: ReactNode;
  /** Esc 와 머리의 닫기(×) 버튼이 부른다. 바깥 영역 클릭으로는 닫지 않는다 — 입력 중이던 폼이 스치는 클릭에 사라지지 않게 */
  onClose?: () => void;
  width?: number;
};

// 옆 패널 — 목록을 그대로 두고 오른쪽에서 상세를 보며 하는 작업(승인·편집). 짧은 확인·입력은 대화상자(Dialog)를 쓴다.
// 대화상자와 같은 접근성 약속(역할 · 제목 연결 · Esc · 초점 이동·되돌림 · Tab 가둠)을 `useModalPanel` 로 함께 지킨다.
export const Drawer = ({ open = true, title, children, footer, onClose, width = 480, ...rest }: DrawerProps) => {
  const titleId = useId();
  const { panelRef, handleKeyDown } = useModalPanel(open, onClose);

  if (!open) return null;

  return (
    // 바깥을 눌러도 초점이 패널 밖(body)으로 빠지지 않게 한다 — 빠지면 Esc 가 패널에 안 닿는다.
    <StyledDrawerOverlay onMouseDown={(event) => event.target === event.currentTarget && event.preventDefault()}>
      <StyledDrawerPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        $width={width}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        <StyledDrawerHeader>
          {title ? <StyledDrawerTitle id={titleId}>{title}</StyledDrawerTitle> : <span />}
          {onClose ? <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="닫기" onClick={onClose} /> : null}
        </StyledDrawerHeader>
        <StyledDrawerBody>{children}</StyledDrawerBody>
        {footer ? <StyledDrawerFooter>{footer}</StyledDrawerFooter> : null}
      </StyledDrawerPanel>
    </StyledDrawerOverlay>
  );
};
