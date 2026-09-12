"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/lib/http";
import { AlertBanner, Button, Card, Input, PageHeader } from "@/shared/ui";
import { getAcademySettings, updateAcademySettings } from "../api";
import { StyledAcademySettingsActions, StyledAcademySettingsLayout } from "./AcademySettingsForm.styled";

// §5.21 GET·PATCH /staff/academy-settings(A-17) — 목록·페이징이 없는 단일 설정
// 화면이다. 필드는 no_show_wait_minutes 하나뿐(정본이 "다른 정책 상수는 범위
// 밖" 이라 명시). 범위(1~30) 검증은 서버가 422 VALIDATION_FAILED 로 판정하고
// 화면은 그 메시지를 그대로 보여준다.
export const AcademySettingsForm = () => {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const settings = await getAcademySettings();
        setValue(String(settings.noShowWaitMinutes));
        setError(null);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "학원 설정을 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const minutes = Number(value);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateAcademySettings({ noShowWaitMinutes: minutes });
      setValue(String(updated.noShowWaitMinutes));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "학원 설정 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>불러오는 중...</p>;

  return (
    <StyledAcademySettingsLayout>
      <PageHeader title="학원 설정" description="무응답 대기 시간 외 다른 정책 값은 이 화면의 범위 밖입니다" />
      <Card padding={16}>
        {error ? <AlertBanner tone="missed" title={error} /> : null}
        {saved ? <AlertBanner tone="boarded" title="저장됐습니다" /> : null}
        <Input
          label="무응답 대기 시간"
          type="number"
          min={1}
          max={30}
          suffix="분"
          hint="1~30 범위, 미승차 판정 전 대기하는 시간입니다"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
      </Card>
      <StyledAcademySettingsActions>
        <Button variant="primary" onClick={handleSave} disabled={saving || value.trim() === ""}>
          {saving ? "저장 중..." : "저장"}
        </Button>
      </StyledAcademySettingsActions>
    </StyledAcademySettingsLayout>
  );
};
