import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useProtectedImageUrl } from "../../hooks/useProtectedImageUrl";
import { Icon } from "../core/Icon";
import { Button } from "../core/Button";
import { Dialog } from "../feedback/Dialog";
import { StyledHelperText, StyledHiddenInput, StyledLabel, StyledPreview, StyledRow, StyledWrap } from "./PhotoUploadField.styled";

// STU-03 / API_SPEC 40행·§5.11 — 사진은 이미지 3종(jpeg·png·webp)·5MB 상한.
// 서버는 8MB 까지 받아 주는 뒷막이가 있지만(FEATURE_SPEC), 화면이 보여주는
// 기준은 어디까지나 사양이 정한 5MB 다 — 두 값을 섞어 안내하지 않는다.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
// §5.11.1 · Ruling 745 — 서버에 WebP 쓰기가 없어 올린 WebP 는 JPEG 로(투명 배경이 있으면 PNG 로) 저장된다.
const WEBP_NOTE = "WebP 는 JPEG 로 저장됩니다 (투명 배경이 있으면 PNG)";
// Ruling 894③ — 저장된 사진은 관계자 웹에서 지울 수 있다(서버 사진 삭제 API). 지우는 호출은 부모가 onRemoveExisting 으로 준다.
const REMOVE_FAILED_NOTE = "사진을 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.";

export type PhotoUploadFieldProps = {
  label?: string;
  /** 이미 등록된 사진 URL(수정 화면 진입 시) */
  existingPhotoUrl?: string;
  /** 유효성 검증을 통과한 파일만 올라온다. 새로 고른 사진을 취소하면 null. */
  onChange: (file: File | null) => void;
  /** 저장된 사진을 서버에서 지운다. 주면 저장된 사진에 [제거] 가 보이고, 실패하면 던져야 한다. */
  onRemoveExisting?: () => Promise<void>;
  error?: string;
};

/** 학생 사진 업로드 — 클라이언트에서 먼저 3종·5MB 를 걸러 서버 뒷막이(8MB)까지 가지 않게 한다. */
export const PhotoUploadField = ({ label = "사진", existingPhotoUrl, onChange, onRemoveExisting, error }: PhotoUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  // 우리가 createObjectURL 로 만든 blob: URL만 추적한다 — existingPhotoUrl(서버 URL)은
  // 우리가 만든 것이 아니라 해제 대상이 아니다.
  const objectUrlRef = useRef<string | undefined>(undefined);
  // 기존 사진은 로그인 토큰으로 받아 온다(Ruling 377) — 받기 전·실패 땐 undefined 라 "사진 없음" 표시.
  // 서버에서 지운 뒤에는 부모가 prop 을 비우기 전에도 사진 없음으로 그린다.
  const [removed, setRemoved] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const shownExistingUrl = removed ? undefined : existingPhotoUrl;
  const existingSrc = useProtectedImageUrl(shownExistingUrl);
  // 사용자가 새로 고른 파일의 미리보기 blob: URL. 없으면 기존 사진을 그린다.
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>(undefined);
  const previewUrl = localPreviewUrl ?? existingSrc;
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [localNote, setLocalNote] = useState<string | undefined>(undefined);

  // 언마운트 갈래 — 마지막으로 만든 blob: URL 을 해제한다. 안 하면 화면을 오래 쓸수록
  // 미리보기용 객체 URL 이 메모리에 쌓인다.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("jpeg · png · webp 파일만 올릴 수 있습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError("사진은 5MB 이하만 올릴 수 있습니다.");
      event.target.value = "";
      return;
    }

    // 파일 교체 갈래 — 새 blob: URL 을 만들기 전에 직전 것을 해제한다.
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;

    setLocalError(undefined);
    setLocalNote(file.type === "image/webp" ? WEBP_NOTE : undefined);
    setLocalPreviewUrl(nextUrl);
    onChange(file);
  };

  // 저장 전에 새로 고른 사진을 취소한다 — 저장된 사진이 있으면 그 사진이 다시 보인다.
  const handleCancelPicked = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = undefined;
    }
    setLocalError(undefined);
    setLocalNote(undefined);
    setLocalPreviewUrl(undefined);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveExisting = async () => {
    if (!onRemoveExisting) return;
    setRemoving(true);
    try {
      await onRemoveExisting();
      setRemoved(true);
      setLocalError(undefined);
    } catch {
      setLocalError(REMOVE_FAILED_NOTE);
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  const helperText = localError ?? error ?? localNote;

  return (
    <StyledWrap>
      <StyledLabel>{label}</StyledLabel>
      <StyledRow>
        <StyledPreview>
          {previewUrl ? (
            // blob: URL(선택 직후 미리보기)까지 받아야 해서 next/image 최적화 대상 밖 —
            // unoptimized 로 그대로 그린다.
            <Image src={previewUrl} alt="" width={64} height={64} unoptimized />
          ) : (
            <Icon name="user" size={24} />
          )}
        </StyledPreview>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          사진 선택
        </Button>
        {localPreviewUrl ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleCancelPicked}>
            제거
          </Button>
        ) : null}
        {shownExistingUrl && !localPreviewUrl && onRemoveExisting ? (
          <Button type="button" variant="ghostDanger" size="sm" aria-label="저장된 사진 제거" onClick={() => setConfirmRemove(true)}>
            제거
          </Button>
        ) : null}
        <StyledHiddenInput
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
        />
      </StyledRow>
      {helperText ? <StyledHelperText $error={!!(localError ?? error)}>{helperText}</StyledHelperText> : null}
      <Dialog
        open={confirmRemove}
        title="저장된 사진을 지울까요?"
        onClose={() => setConfirmRemove(false)}
        footer={
          <>
            <Button type="button" variant="secondary" disabled={removing} onClick={() => setConfirmRemove(false)}>
              취소
            </Button>
            <Button type="button" variant="danger" disabled={removing} onClick={() => void handleRemoveExisting()}>
              지우기
            </Button>
          </>
        }
      >
        <p>지운 사진은 되돌릴 수 없어요. 다른 사진을 다시 올릴 수는 있어요.</p>
      </Dialog>
    </StyledWrap>
  );
};
