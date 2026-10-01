"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/features/auth";
import { ApiError } from "@/shared/lib/http";
import { usePolling, useRealtimeChannel } from "@/shared/hooks";
import {
  academyLiveDestination,
  parseWsEmergencyCanceledPayload,
  parseWsEmergencyRaisedPayload,
  type WebSocketEnvelope,
} from "@/shared/lib/ws";
import { AlertBanner, Button } from "@/shared/ui";
import { ackEmergency, getEmergencies } from "../api";
import { toEmergencyTypeLabel } from "../lib/emergencyLabels";
import { StyledEmergencyPopupStack, StyledFoldRow } from "./EmergencyAlertProvider.styled";

// 팝업 한 건에 필요한 것만 — REST 목록과 WebSocket 통지 양쪽에서 같은 모양으로 만든다.
export type EmergencyAlert = { emergencyId: string; busNo: string; type: string; raisedByName: string | null };

// 비상 알림을 어디서 받아 오는가 — 관계자는 기본값을 쓰고, 메인 관리자 레이아웃은 관리자 쪽 조회·채널을 넘긴다(A#6).
// `ack` 가 없으면 이 화면의 사용자는 확인 주체가 아니라(메인 관리자) 확인 버튼 없이 목록으로만 안내한다.
export type EmergencyAlertSource = {
  destination: string;
  fetchUnacked: () => Promise<EmergencyAlert[]>;
  ack?: (emergencyId: string) => Promise<void>;
  listPath: string;
};

type EmergencyAlertState = {
  alerts: EmergencyAlert[];
  ackingId: string | null;
  ackFailedId: string | null;
  isAckable: boolean;
  listPath: string;
  onAck: (emergencyId: string) => void;
};

// 비상 알림은 지연 인지 자체가 위험이라 WebSocket 이 끊겨도 놓치지 않게 짧게 다시 확인한다(EmergencyAlertsPage 와 같은 5초).
const EMERGENCY_POLL_INTERVAL_MS = 5000;
// 탭이 숨어 있어도 폴링을 멈추지 않는다 — 근무 중 관계자가 다른 창을 보는 것이 평상 사용이고, 이 알림의 소리·브라우저 알림은 바로 그때
// 알아채게 하려는 기능이다. 숨은 탭의 WebSocket 이 끊긴 사이에는 이 폴링이 유일한 경로라 느린 간격으로라도 돈다(R46-FIXCONN C-1 ②).
// 관계자 25명 기준 초당 1건 미만.
const EMERGENCY_HIDDEN_POLL_INTERVAL_MS = 30000;

const EMPTY_STATE: EmergencyAlertState = { alerts: [], ackingId: null, ackFailedId: null, isAckable: true, listPath: "/emergency", onAck: () => {} };

const EmergencyAlertContext = createContext<EmergencyAlertState>(EMPTY_STATE);

// 사이드바 '비상 알림' 건수 — 확인하지 않은 비상 알림 수.
export const useEmergencyUnackedCount = (): number => useContext(EmergencyAlertContext).alerts.length;

// 관계자 전 화면(`(staff)` 레이아웃)에서 비상 알림을 받아 확인 전까지 띠로 유지한다 — 띠를 그리는 것은 `EmergencyAlertStrip`.
// 구독을 화면이 아니라 레이아웃 한 곳에 둔다 — 대시보드에서만 받으면 다른 화면에서는 신고를 놓친다.
// WebSocket 연결은 `useRealtimeChannel` 이 하나를 공유하므로 대시보드의 구독과 연결이 겹쳐 열리지 않는다.
export const EmergencyAlertProvider = ({ children, source }: { children: React.ReactNode; source?: EmergencyAlertSource }) => {
  const { session } = useAuthSession();
  const defaultSource = useMemo<EmergencyAlertSource>(
    () => ({
      destination: academyLiveDestination(session?.academy?.id ?? ""),
      fetchUnacked: async () =>
        (await getEmergencies({ status: "open" })).items.map((item) => ({
          emergencyId: item.emergencyId,
          busNo: item.busNo,
          type: item.type,
          raisedByName: item.raisedBy.name,
        })),
      ack: async (emergencyId) => void (await ackEmergency(emergencyId)),
      listPath: "/emergency",
    }),
    [session?.academy?.id],
  );
  const { destination, fetchUnacked, ack, listPath } = source ?? defaultSource;
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [ackingId, setAckingId] = useState<string | null>(null);
  // 실패 문구는 실패한 알림 id 에 묶는다 — 그 알림이 사라지면 문구도 함께 사라져 새 비상 건 옆에 남지 않는다(F01-12).
  const [ackFailedId, setAckFailedId] = useState<string | null>(null);
  // 요청 번호 — ack 성공 직전에 나간 폴링의 옛 응답이 방금 닫은 팝업을 되살리지 못하게 한다(F01-12).
  const requestSeq = useRef(0);

  // 서버의 미확인(open) 목록이 기준이다 — 통지를 놓쳤거나 새로고침한 뒤에도 미확인 신고가 다시 뜬다.
  // 돌려주는 값은 폴링용 성공 여부다(`usePolling` 이 실패하면 간격을 늘린다).
  const load = useCallback(async (): Promise<boolean> => {
    const mine = ++requestSeq.current;
    try {
      const items = await fetchUnacked();
      if (mine !== requestSeq.current) return true;
      setAlerts(items);
      return true;
    } catch {
      // 다음 주기에 다시 시도한다 — 실패했다고 이미 뜬 팝업을 지우지 않는다.
      return false;
    }
  }, [fetchUnacked]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  // 응답을 받은 뒤 다음 요청을 예약하고, 숨은 탭에서는 느린 간격으로 이어가며, 실패하면 간격을 늘린다(R46-WEB C · R46-FIXCONN C-1).
  usePolling(load, EMERGENCY_POLL_INTERVAL_MS, true, EMERGENCY_HIDDEN_POLL_INTERVAL_MS);

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
  // 연결이 끊겼다 돌아오면 끊긴 사이의 신고를 서버 목록으로 한 번 메운다(`API_SPEC §7.2` 재연결 직후 보충).
  useRealtimeChannel(destination, handleEnvelope, () => void load());

  const closeAcked = useCallback(
    (emergencyId: string) => {
      setAlerts((prev) => prev.filter((alert) => alert.emergencyId !== emergencyId));
      // load() 가 요청 번호를 올려, ack 전에 나간 폴링의 옛 응답은 이 시점부터 버려진다.
      void load();
    },
    [load],
  );

  const handleAck = useCallback(
    async (emergencyId: string) => {
      if (!ack) return;
      setAckingId(emergencyId);
      setAckFailedId(null);
      try {
        await ack(emergencyId);
        closeAcked(emergencyId);
      } catch (cause) {
        // 다른 관계자가 먼저 확인한 건(409)은 이미 처리된 것이라 실패로 안내하지 않는다 — 다시 눌러도 같은 결과다.
        if (cause instanceof ApiError && cause.code === "ALREADY_ACKED") closeAcked(emergencyId);
        else setAckFailedId(emergencyId);
      } finally {
        setAckingId(null);
      }
    },
    [ack, closeAcked],
  );

  const state = useMemo<EmergencyAlertState>(
    () => ({ alerts, ackingId, ackFailedId, isAckable: ack !== undefined, listPath, onAck: (id) => void handleAck(id) }),
    [alerts, ackingId, ackFailedId, ack, listPath, handleAck],
  );

  return <EmergencyAlertContext.Provider value={state}>{children}</EmergencyAlertContext.Provider>;
};

// 미확인 비상 알림 띠 — 레이아웃의 머리줄 바로 아래에 둔다. 화면 위에 띄우지 않고 흐름에 넣어, 등록·배치 변경 같은 버튼을 가리지 않는다.
//
// 접으면 신고 내용 대신 미확인 건수 한 줄만 남는다. 접은 시점에 없던 신고가 들어오면 접힌 상태를 풀어 새 신고를 보여 준다
// (접은 건 아이디를 기억해 두고 비교 — 건수만 비교하면 한 건 확인 뒤 새 신고가 와도 같은 건수라 접힌 채 가려진다).
export const EmergencyAlertStrip = () => {
  const router = useRouter();
  const { alerts, ackingId, ackFailedId, isAckable, listPath, onAck } = useContext(EmergencyAlertContext);
  const [foldedIds, setFoldedIds] = useState<ReadonlySet<string> | null>(null);
  if (alerts.length === 0) return null;

  const isFolded = foldedIds !== null && alerts.every((alert) => foldedIds.has(alert.emergencyId));
  if (isFolded) {
    return (
      <StyledEmergencyPopupStack role="alert">
        <AlertBanner
          tone="missed"
          title={`미확인 비상 알림 ${alerts.length}건`}
          action={
            <Button size="sm" variant="secondary" onClick={() => setFoldedIds(null)}>
              펼치기
            </Button>
          }
        />
      </StyledEmergencyPopupStack>
    );
  }

  return (
    <StyledEmergencyPopupStack role="alert">
      {alerts.map((alert) => (
        <AlertBanner
          key={alert.emergencyId}
          tone="missed"
          title={`비상 상황 — ${alert.busNo} · ${toEmergencyTypeLabel(alert.type)}`}
          action={
            <>
              {isAckable ? (
                <Button size="sm" variant="danger" disabled={ackingId === alert.emergencyId} onClick={() => onAck(alert.emergencyId)}>
                  확인
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => router.push(listPath)}>
                비상 알림 목록
              </Button>
            </>
          }
        >
          {alert.raisedByName ? `${alert.raisedByName} 님이 신고했습니다. ` : ""}
          {isAckable
            ? "[확인]은 알림을 봤다는 표시이지 조치를 마쳤다는 뜻이 아닙니다. 누르면 이 띠가 사라지고 다른 관계자 화면에서도 확인됨으로 바뀝니다."
            : "학원 관계자가 확인하면 사라집니다."}
        </AlertBanner>
      ))}
      {ackFailedId != null && alerts.some((alert) => alert.emergencyId === ackFailedId) ? (
        <AlertBanner tone="missed" title="확인 처리에 실패했습니다. 다시 눌러 주세요." />
      ) : null}
      <StyledFoldRow>
        <Button size="sm" variant="ghost" onClick={() => setFoldedIds(new Set(alerts.map((alert) => alert.emergencyId)))}>
          접기
        </Button>
      </StyledFoldRow>
    </StyledEmergencyPopupStack>
  );
};
