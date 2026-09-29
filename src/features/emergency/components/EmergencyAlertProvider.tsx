"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth";
import { useRealtimeChannel } from "@/shared/hooks";
import {
  academyLiveDestination,
  parseWsEmergencyCanceledPayload,
  parseWsEmergencyRaisedPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { AlertBanner, Button } from "@/shared/ui";
import { ackEmergency, getEmergencies } from "../api";
import { toEmergencyTypeLabel } from "../lib/emergencyLabels";
import { StyledEmergencyPopupStack } from "./EmergencyAlertProvider.styled";

// 팝업 한 건에 필요한 것만 — REST 목록과 WebSocket 통지 양쪽에서 같은 모양으로 만든다.
type EmergencyAlert = { emergencyId: string; busNo: string; type: string; raisedByName: string | null };

// 비상 알림은 지연 인지 자체가 위험이라 WebSocket 이 끊겨도 놓치지 않게 짧게 다시 확인한다(EmergencyAlertsPage 와 같은 5초).
const EMERGENCY_POLL_INTERVAL_MS = 5000;

const EmergencyAlertContext = createContext<number>(0);

// 사이드바 '비상 알림' 건수 — 확인하지 않은 비상 알림 수.
export const useEmergencyUnackedCount = (): number => useContext(EmergencyAlertContext);

// 관계자 전 화면(`(staff)` 레이아웃)에서 비상 알림을 받아 확인 전까지 팝업으로 유지한다.
// 구독을 화면이 아니라 레이아웃 한 곳에 둔다 — 대시보드에서만 받으면 다른 화면에서는 신고를 놓친다.
// WebSocket 연결은 `useRealtimeChannel` 이 하나를 공유하므로 대시보드의 구독과 연결이 겹쳐 열리지 않는다.
export const EmergencyAlertProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuthSession();
  const router = useRouter();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);

  // 서버의 미확인(open) 목록이 기준이다 — 통지를 놓쳤거나 새로고침한 뒤에도 미확인 신고가 다시 뜬다.
  const load = useCallback(async () => {
    try {
      const data = await getEmergencies({ status: "open" });
      setAlerts(
        data.items.map((item) => ({
          emergencyId: item.emergencyId,
          busNo: item.busNo,
          type: item.type,
          raisedByName: item.raisedBy.name,
        })),
      );
    } catch {
      // 다음 주기에 다시 시도한다 — 실패했다고 이미 뜬 팝업을 지우지 않는다.
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
    const timer = setInterval(load, EMERGENCY_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleEnvelope = useCallback(
    (envelope: WebSocketEnvelope) => {
      if (envelope.event === "emergency_raised") {
        const payload = parseWsEmergencyRaisedPayload(envelope.payload);
        // 서버 재조회보다 먼저 보이도록 통지 내용으로 바로 띄우고, 이어서 서버 기준으로 맞춘다.
        setAlerts((prev) =>
          prev.some((alert) => alert.emergencyId === payload.emergencyId)
            ? prev
            : [
                ...prev,
                { emergencyId: payload.emergencyId, busNo: payload.busNo, type: payload.type, raisedByName: payload.raisedBy.name },
              ],
        );
        void load();
      } else if (envelope.event === "emergency_canceled") {
        const payload = parseWsEmergencyCanceledPayload(envelope.payload);
        setAlerts((prev) => prev.filter((alert) => alert.emergencyId !== payload.emergencyId));
        void load();
      }
    },
    [load],
  );
  useRealtimeChannel(academyLiveDestination(session?.academy?.id ?? ""), handleEnvelope);

  const handleAck = async (emergencyId: string) => {
    setAckingId(emergencyId);
    setAckError(null);
    try {
      await ackEmergency(emergencyId);
      setAlerts((prev) => prev.filter((alert) => alert.emergencyId !== emergencyId));
      void load();
    } catch {
      setAckError("확인 처리에 실패했습니다. 다시 눌러 주세요.");
    } finally {
      setAckingId(null);
    }
  };

  const count = useMemo(() => alerts.length, [alerts]);

  return (
    <EmergencyAlertContext.Provider value={count}>
      {children}
      {alerts.length > 0 ? (
        <StyledEmergencyPopupStack role="alert">
          {alerts.map((alert) => (
            <AlertBanner
              key={alert.emergencyId}
              tone="missed"
              title={`비상 상황 — ${alert.busNo} · ${toEmergencyTypeLabel(alert.type)}`}
              action={
                <>
                  <Button size="sm" variant="danger" disabled={ackingId === alert.emergencyId} onClick={() => handleAck(alert.emergencyId)}>
                    확인
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => router.push("/emergency")}>
                    비상 알림 목록
                  </Button>
                </>
              }
            >
              {alert.raisedByName ? `${alert.raisedByName} 님이 신고했습니다. ` : ""}확인하기 전까지 이 알림은 계속 표시됩니다.
            </AlertBanner>
          ))}
          {ackError ? <AlertBanner tone="missed" title={ackError} /> : null}
        </StyledEmergencyPopupStack>
      ) : null}
    </EmergencyAlertContext.Provider>
  );
};
