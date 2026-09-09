import type { HTMLAttributes } from "react";
import {
  StyledBottomSheetRoot,
  StyledBottomSheetScrim,
  StyledBottomSheetPanel,
  StyledBottomSheetHandle,
  StyledBottomSheetTitle,
} from "./BottomSheet.styled";

export type BottomSheetProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  title?: string;
  onClose?: () => void;
};

// 지도 위에서 정보를 겹쳐 보여줄 때 — 실시간 위치 화면의 운행 요약, 정류장 상세.
// 반경은 상단만 24. 지도 화면에서 유일하게 --shadow-sheet 를 쓰는 곳이다.
// Dialog 와 마찬가지로 부모 요소에 position: relative 가 필요하다.
export const BottomSheet = ({ open = true, title, children, onClose, ...rest }: BottomSheetProps) => {
  if (!open) return null;
  return (
    <StyledBottomSheetRoot>
      <StyledBottomSheetScrim onClick={onClose} />
      <StyledBottomSheetPanel {...rest}>
        <StyledBottomSheetHandle />
        {title ? <StyledBottomSheetTitle>{title}</StyledBottomSheetTitle> : null}
        {children}
      </StyledBottomSheetPanel>
    </StyledBottomSheetRoot>
  );
};
