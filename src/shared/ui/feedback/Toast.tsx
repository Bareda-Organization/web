"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../core/Icon";
import { StyledToast, StyledToastRegion, StyledToastText, StyledToastUndo } from "./Toast.styled";

export type ToastInput = {
  /** 한 줄 결과 — 예: "나우진 계정의 로그인 차단을 해제했습니다" */
  title: string;
  /** 보조 한 줄 — 예: "처리자와 일시가 이력에 남았습니다" */
  detail?: string;
  /** 있으면 '되돌리기'를 붙인다. 되돌릴 수 있는 동작에만 넘긴다 */
  onUndo?: () => void;
  /** 저절로 사라질 때까지(ms). 기본 5000 */
  durationMs?: number;
};

type ToastEntry = ToastInput & { id: number };

const DEFAULT_DURATION_MS = 5000;

// 알림 주인(Provider)이 없는 곳(화면 하나만 따로 그린 시험 등)에서 부르면 조용히 아무 일도 하지 않는다.
const ToastContext = createContext<{ show: (toast: ToastInput) => void }>({ show: () => undefined });

/** 처리 결과 알림(토스트)을 띄운다 — `const { show } = useToast(); show({ title: "저장했습니다" })`. */
export const useToast = () => useContext(ToastContext);

const ToastItem = ({ toast, onDismiss }: { toast: ToastEntry; onDismiss: (id: number) => void }) => {
  const { id, durationMs = DEFAULT_DURATION_MS } = toast;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), durationMs);
    return () => clearTimeout(timer);
  }, [id, durationMs, onDismiss]);

  const handleUndo = () => {
    toast.onUndo?.();
    onDismiss(id);
  };

  return (
    <StyledToast role="status" aria-live="polite">
      <Icon name="circle-check" size={16} />
      <StyledToastText>
        <span>{toast.title}</span>
        {toast.detail ? <small>{toast.detail}</small> : null}
      </StyledToastText>
      {toast.onUndo ? (
        <StyledToastUndo type="button" onClick={handleUndo}>
          되돌리기
        </StyledToastUndo>
      ) : null}
    </StyledToast>
  );
};

/**
 * 처리 결과 알림 영역 — 화면 오른쪽 아래에 고정되어 쌓이고 저절로 사라진다. 레이아웃(껍데기)에 한 번만 둔다.
 * 오류는 알림 띠(AlertBanner)로 위에 따로 알리고, 이 알림은 성공한 처리 결과에만 쓴다.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((previous) => previous.filter((toast) => toast.id !== id)), []);
  const show = useCallback((toast: ToastInput) => setToasts((previous) => [...previous, { ...toast, id: nextId.current++ }]), []);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <StyledToastRegion>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </StyledToastRegion>
    </ToastContext.Provider>
  );
};
