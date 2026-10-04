import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "../core/Button";
import {
  StyledDialogOverlay,
  StyledDialogPanel,
  StyledDialogHeader,
  StyledDialogTitle,
  StyledDialogBody,
  StyledDialogActionHint,
  StyledDialogFooter,
} from "./Dialog.styled";
import { useModalPanel } from "./useModalPanel";

export type DialogProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  title?: string;
  /** 버튼 영역. 취소는 ghost, 확정은 primary 또는 danger. 실행 버튼 이름은 제목의 동작 이름과 같게("대상 + 동작") 쓴다 */
  footer?: ReactNode;
  /** 꺼진 실행 버튼 아래에 놓는 이유 글 — 예: "사유를 입력하면 [강제 확정] 버튼이 켜집니다". 버튼이 켜져 있으면 넘기지 않는다 */
  actionHint?: ReactNode;
  /** Esc 로 닫을 때 부른다. 바깥 영역 클릭으로는 닫지 않는다 — 입력 중이던 폼이 스치는 클릭에 사라지지 않게 */
  onClose?: () => void;
  /** 머리 오른쪽에 닫기(×) 버튼을 낸다 — onClose 가 있어야 한다. 푸터에 이미 '닫기' 버튼이 있는 대화상자에는 켜지 않는다 */
  showClose?: boolean;
  width?: number;
};

// 확정이 필요한 행동에만 쓴다 — 삭제, 강제 추가, 지연 알림 전송 확인.
// 오버레이는 화면(뷰포트) 기준으로 뜬다 — 위치 잡힌 부모가 없어도, 스크롤한 목록에서 열어도 가운데에 보인다.
// 대화상자 역할·제목 연결·Esc·초점 이동·Tab 가둠은 옆 패널(Drawer)과 함께 `useModalPanel` 이 한 번에 처리한다.
export const Dialog = ({
  open = true,
  title,
  children,
  footer,
  actionHint,
  onClose,
  showClose = false,
  width = 440,
  ...rest
}: DialogProps) => {
  const titleId = useId();
  const { panelRef, handleKeyDown } = useModalPanel(open, onClose);

  if (!open) return null;

  const hasHeader = Boolean(title) || (showClose && Boolean(onClose));

  return (
    // 바깥을 눌러도 초점이 패널 밖(body)으로 빠지지 않게 한다 — 빠지면 Esc 가 패널에 안 닿는다.
    <StyledDialogOverlay onMouseDown={(event) => event.target === event.currentTarget && event.preventDefault()}>
      <StyledDialogPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        $width={width}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {hasHeader ? (
          <StyledDialogHeader>
            {title ? <StyledDialogTitle id={titleId}>{title}</StyledDialogTitle> : <span />}
            {showClose && onClose ? <Button variant="ghost" size="sm" iconOnly icon="x" aria-label="닫기" onClick={onClose} /> : null}
          </StyledDialogHeader>
        ) : null}
        <StyledDialogBody $hasHeader={hasHeader}>
          {children}
          {actionHint ? <StyledDialogActionHint>{actionHint}</StyledDialogActionHint> : null}
        </StyledDialogBody>
        {footer ? <StyledDialogFooter>{footer}</StyledDialogFooter> : null}
      </StyledDialogPanel>
    </StyledDialogOverlay>
  );
};
