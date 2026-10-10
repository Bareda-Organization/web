"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { useLeaveWarning } from "@/shared/lib/navigation/useLeaveWarning";
import { AlertBanner, Button, Card, Input, PageHeader, Timeline, useToast } from "@/shared/ui";
import { getAcademySettings, updateAcademySettings } from "../api";
import type { AcademyInfoTypes, AcademyPolicyTypes } from "../types";
import {
  StyledAcademySettingsLayout,
  StyledKvList,
  StyledPresetRow,
  StyledSaveBar,
  StyledSettingsBoard,
  StyledSettingsSection,
} from "./AcademySettingsForm.styled";

// 자주 쓰는 값 — 사양 기본값 3분과 범위(1~30) 안의 대표값.
const PRESET_MINUTES = [1, 3, 5, 10, 15, 30];
const DEFAULT_MINUTES = 3;
const MIN_MINUTES = 1;
const MAX_MINUTES = 30;

// 전 학원 공통 정책 6항목의 이름과 값 모양 — 값은 서버가 실제로 쓰는 상수를 그대로 싣는다(Ruling 820). 화면에 숫자를 박지 않는다.
const POLICY_ROWS: { label: string; format: (policy: AcademyPolicyTypes) => string }[] = [
  { label: "노선 확정 시점", format: (p) => `출발 ${p.confirmLeadMinutes}분 전` },
  { label: "운행 시작 버튼 활성 창", format: (p) => `출발 ±${p.startWindowMinutes}분` },
  { label: "② 구간 변경 한도", format: (p) => `회차당 ${p.changeQuotaPerRun}회` },
  { label: "지연 알림 단위", format: (p) => `${p.delayUnitMinutes}분` },
  { label: "근접 알림 기준", format: (p) => `${p.proximityAlertMeters}m` },
  { label: "알림 보관", format: (p) => `${p.notificationRetentionDays}일` },
];

// 학원 상태 값의 한글 표기 — 메인 관리자 화면(학원 목록 · 상태 탭)과 같은 말이다. 모르는 값은 그대로 보인다.
const ACADEMY_STATUS_LABEL: Record<string, string> = { active: "활성", inactive: "비활성" };

// §5.21 GET·PATCH /staff/academy-settings(A-17) — 학원이 바꿀 수 있는 값은 미승차 대기 시간 하나뿐이다.
// 오른쪽에 전 학원 공통 정책과 학원 정보를 읽기 전용으로 보인다("왜 이것만 바뀌나" 에 값으로 답한다).
// 범위(1~30)는 화면이 먼저 알리고(저장 비활성), 서버도 422 VALIDATION_FAILED 로 판정한다 — 그 문구는 그대로 노출한다.
export const AcademySettingsForm = () => {
  const [value, setValue] = useState("");
  const [savedMinutes, setSavedMinutes] = useState<number | null>(null);
  const [academy, setAcademy] = useState<AcademyInfoTypes | null>(null);
  const [policy, setPolicy] = useState<AcademyPolicyTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { markSaved } = useLeaveWarning(value, !loading, "저장하지 않은 학원 설정 변경이 사라집니다. 이 화면을 떠날까요?");
  const { show } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const settings = await getAcademySettings();
        setValue(String(settings.noShowWaitMinutes));
        setSavedMinutes(settings.noShowWaitMinutes);
        setAcademy(settings.academy);
        setPolicy(settings.policy);
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "학원 설정을 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const minutes = Number(value);
  const isEmpty = value.trim() === "";
  const isOutOfRange = !isEmpty && (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES);
  const isChanged = savedMinutes !== null && !isEmpty && minutes !== savedMinutes;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAcademySettings({ noShowWaitMinutes: minutes });
      setValue(String(updated.noShowWaitMinutes));
      setSavedMinutes(updated.noShowWaitMinutes);
      markSaved(String(updated.noShowWaitMinutes));
      show({ title: "학원 설정을 저장했습니다", detail: `미승차 대기 ${updated.noShowWaitMinutes}분 — 저장 뒤 새로 시작되는 미승차부터 적용됩니다. 이미 진행 중인 카운트다운은 그대로입니다` });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "학원 설정 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>불러오는 중...</p>;

  return (
    <StyledAcademySettingsLayout>
      <PageHeader title="학원 설정" description="학원이 바꿀 수 있는 값은 미승차 대기 시간 하나입니다 — 나머지 정책은 모든 학원에 같게 적용됩니다" />
      <StyledSettingsBoard>
        <Card padding={20}>
          {error ? <AlertBanner tone="missed" title={error} /> : null}
          <StyledSettingsSection>
            <Input
              label="미승차 대기 시간"
              type="number"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              suffix="분"
              hint={`${MIN_MINUTES}~${MAX_MINUTES} 범위, 미승차 판정 전 대기하는 시간입니다 (기본 ${DEFAULT_MINUTES}분)`}
              value={value}
              aria-invalid={isOutOfRange || undefined}
              error={isOutOfRange ? `${MIN_MINUTES}~${MAX_MINUTES}분 안에서 정수로 입력해 주세요` : undefined}
              onChange={(event) => setValue(event.target.value)}
            />
            <StyledPresetRow role="group" aria-label="자주 쓰는 값">
              <span>자주 쓰는 값</span>
              {PRESET_MINUTES.map((preset) => (
                <Button key={preset} size="sm" variant={minutes === preset ? "soft" : "secondary"} onClick={() => setValue(String(preset))}>
                  {preset}분{preset === DEFAULT_MINUTES ? "(기본)" : ""}
                </Button>
              ))}
            </StyledPresetRow>
            {savedMinutes !== null && isChanged && !isOutOfRange ? <p>저장된 값 {savedMinutes}분 → 새 값 {minutes}분</p> : null}
          </StyledSettingsSection>

          <StyledSettingsSection>
            <h2>바꾸면 미승차 처리가 이렇게 진행됩니다</h2>
            {isEmpty || isOutOfRange ? (
              <p>올바른 값을 입력하면 진행 순서를 보여 드립니다.</p>
            ) : (
              <Timeline
                aria-label="미승차 처리 진행 순서"
                items={[
                  { tone: "end", title: "동승자가 [미승차] 처리", meta: "카운트다운 시작" },
                  { tone: "end", title: `${minutes}분 카운트다운 — 보호자 연락`, meta: "만료되면 무응답으로 확정" },
                  { tone: "bad", title: "관계자에게 보고" },
                  { tone: "ok", title: "출발 확정 · 재시도 활성", meta: "관계자 판단으로 출발합니다" },
                ]}
              />
            )}
            <p>저장 뒤 새로 시작되는 미승차부터 적용됩니다. 이미 진행 중인 카운트다운은 시작 때 정한 만료 시각 그대로입니다.</p>
          </StyledSettingsSection>

          <StyledSaveBar data-dirty={isChanged || undefined}>
            <span>{isChanged ? "변경 1건" : "변경 없음"}</span>
            <Button variant="ghost" disabled={!isChanged || saving} onClick={() => setValue(String(savedMinutes))}>
              되돌리기
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || isEmpty || isOutOfRange}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </StyledSaveBar>
        </Card>

        <div>
          {policy ? (
            <Card padding={20}>
              <StyledSettingsSection>
                <h2>전 학원 공통 정책</h2>
                <p>읽기 전용 — 학원마다 바꿀 수 없습니다.</p>
                <StyledKvList aria-label="전 학원 공통 정책">
                  {POLICY_ROWS.map((row) => (
                    <div key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.format(policy)}</dd>
                    </div>
                  ))}
                </StyledKvList>
              </StyledSettingsSection>
            </Card>
          ) : null}
          {academy ? (
            <Card padding={20}>
              <StyledSettingsSection>
                <h2>학원 정보</h2>
                <StyledKvList aria-label="학원 정보">
                  <div>
                    <dt>학원명</dt>
                    <dd>{academy.name}</dd>
                  </div>
                  {academy.code ? (
                    <div>
                      <dt>코드</dt>
                      <dd>{academy.code}</dd>
                    </div>
                  ) : null}
                  {academy.region ? (
                    <div>
                      <dt>지역</dt>
                      <dd>{academy.region}</dd>
                    </div>
                  ) : null}
                  {academy.status ? (
                    <div>
                      <dt>상태</dt>
                      <dd>{ACADEMY_STATUS_LABEL[academy.status] ?? academy.status}</dd>
                    </div>
                  ) : null}
                </StyledKvList>
              </StyledSettingsSection>
            </Card>
          ) : null}
        </div>
      </StyledSettingsBoard>
    </StyledAcademySettingsLayout>
  );
};
