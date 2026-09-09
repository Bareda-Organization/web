import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { StyledDialogOverlay, StyledDialogPanel, StyledDialogTitle, StyledDialogBody, StyledDialogFooter } from "./Dialog.styled";

export type DialogProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  title?: string;
  /** 버튼 영역. 취소는 ghost, 확정은 primary 또는 danger */
  footer?: ReactNode;
  onClose?: () => void;
  width?: number;
};

// 확정이 필요한 행동에만 쓴다 — 삭제, 강제 추가, 지연 알림 전송 확인.
// 부모가 자리를 잡는 부모 요소에 position: relative 를 줘야 한다 (오버레이가 그 안에서 덮인다).
export const Dialog = ({ open = true, title, children, footer, onClose, width = 420, ...rest }: DialogProps) => {
  if (!open) return null;

  const stopOverlayClose = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <StyledDialogOverlay onClick={onClose}>
      <StyledDialogPanel $width={width} onClick={stopOverlayClose} {...rest}>
        {title ? <StyledDialogTitle>{title}</StyledDialogTitle> : null}
        <StyledDialogBody $hasTitle={Boolean(title)}>{children}</StyledDialogBody>
        {footer ? <StyledDialogFooter>{footer}</StyledDialogFooter> : null}
      </StyledDialogPanel>
    </StyledDialogOverlay>
  );
};
