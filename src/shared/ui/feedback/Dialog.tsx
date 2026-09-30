import { useEffect, useId, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { StyledDialogOverlay, StyledDialogPanel, StyledDialogTitle, StyledDialogBody, StyledDialogFooter } from "./Dialog.styled";

export type DialogProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  title?: string;
  /** 버튼 영역. 취소는 ghost, 확정은 primary 또는 danger */
  footer?: ReactNode;
  /** Esc 로 닫을 때 부른다. 바깥 영역 클릭으로는 닫지 않는다 — 입력 중이던 폼이 스치는 클릭에 사라지지 않게 */
  onClose?: () => void;
  width?: number;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 확정이 필요한 행동에만 쓴다 — 삭제, 강제 추가, 지연 알림 전송 확인.
// 오버레이는 화면(뷰포트) 기준으로 뜬다 — 위치 잡힌 부모가 없어도, 스크롤한 목록에서 열어도 가운데에 보인다.
// 대화상자 역할·제목 연결·Esc·초점 이동·Tab 가둠을 여기서 한 번에 처리한다(WAI-ARIA 대화상자 패턴).
export const Dialog = ({ open = true, title, children, footer, onClose, width = 420, ...rest }: DialogProps) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // 열릴 때 패널로 초점을 옮기고, 닫히면 열기 전 요소로 돌려준다.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose?.();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
        {title ? <StyledDialogTitle id={titleId}>{title}</StyledDialogTitle> : null}
        <StyledDialogBody $hasTitle={Boolean(title)}>{children}</StyledDialogBody>
        {footer ? <StyledDialogFooter>{footer}</StyledDialogFooter> : null}
      </StyledDialogPanel>
    </StyledDialogOverlay>
  );
};
