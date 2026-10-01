"use client";

import { useState } from "react";
import { Button } from "@/shared/ui";

type PhoneContactProps = {
  phone: string | null;
};

// 다이얼러에 넘기는 번호 — 하이픈·공백은 빼고 숫자와 선행 +만 남긴다.
const toTelHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

// B1 #17 — 비상 대응의 첫 일은 전화다. 번호를 누르면 바로 걸리고(tel:), 데스크톱처럼 걸 수 없는 곳에서는 복사해
// 다른 수단으로 건다. 번호가 없으면(서버가 마스킹·미보유로 비움) 링크 없이 그 사실만 보인다.
export const PhoneContact = ({ phone }: PhoneContactProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  if (phone === null) return <span>번호 없음</span>;

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <>
      <a href={toTelHref(phone)}>{phone}</a>{" "}
      <Button variant="ghost" size="sm" onClick={handleCopyClick}>
        {copyState === "copied" ? "복사됨" : copyState === "failed" ? "복사 실패" : "복사"}
      </Button>
    </>
  );
};
