"use client";

// 매니저 관리 화면의 "가입 승인 대기 N건" — 기사·동승자 요청만 센다(Ruling 846 ①).
// 사이드바 배지(`useApprovalPending().signupCount`)는 학부모·학생 요청까지 센 값이라 그대로 두고, 이 값은 따로 읽는다.
// 배지 값이 바뀔 때(승인·거절·새 신청 폴링) 다시 읽는다. 읽지 못하면 undefined — 화면은 문구를 단정하지 않는다.
import { useEffect, useState } from "react";
import { getManagerSignupPendingCount, useApprovalPending } from "@/features/approval";

export const useManagerSignupCount = (): number | undefined => {
  const { signupCount } = useApprovalPending();
  const [count, setCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getManagerSignupPendingCount()
      .then((total) => alive && setCount(total))
      .catch(() => alive && setCount(undefined));
    return () => {
      alive = false;
    };
  }, [signupCount]);

  return count;
};
