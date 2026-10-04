import { Icon } from "@/shared/ui";
import { StyledPhoneLink } from "./TodayRunPage.styled";

// 전화 걸기 단추 — 누르면 기기의 전화로 넘어간다(`tel:`). 모양은 작은 보조 단추와 같다.
// 행마다 반복되므로 접근 이름에 대상을 붙여 넘긴다(U-09) — `label` 이 그대로 이름이다.
export const PhoneLink = ({ phone, label }: { phone: string; label: string }) => (
  <StyledPhoneLink href={`tel:${phone}`} aria-label={`${label} 전화`}>
    <Icon name="phone" size={14} />
    {label}
  </StyledPhoneLink>
);
