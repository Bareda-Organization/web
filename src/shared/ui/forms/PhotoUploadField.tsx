import { useRef, useState } from "react";
import { Icon } from "../core/Icon";
import { Button } from "../core/Button";
import { StyledHelperText, StyledHiddenInput, StyledLabel, StyledPreview, StyledRow, StyledWrap } from "./PhotoUploadField.styled";

// STU-03 / API_SPEC 40행·§5.11 — 사진은 이미지 3종(jpeg·png·webp)·5MB 상한.
// 서버는 8MB 까지 받아 주는 뒷막이가 있지만(FEATURE_SPEC), 화면이 보여주는
// 기준은 어디까지나 사양이 정한 5MB 다 — 두 값을 섞어 안내하지 않는다.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export type PhotoUploadFieldProps = {
  label?: string;
  /** 이미 등록된 사진 URL(수정 화면 진입 시) */
  existingPhotoUrl?: string;
  /** 유효성 검증을 통과한 파일만 올라온다. 제거 시 null. */
  onChange: (file: File | null) => void;
  error?: string;
};

/** 학생 사진 업로드 — 클라이언트에서 먼저 3종·5MB 를 걸러 서버 뒷막이(8MB)까지 가지 않게 한다. */
export const PhotoUploadField = ({ label = "사진", existingPhotoUrl, onChange, error }: PhotoUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingPhotoUrl);
  const [localError, setLocalError] = useState<string | undefined>(undefined);

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

    setLocalError(undefined);
    setPreviewUrl(URL.createObjectURL(file));
    onChange(file);
  };

  const handleRemove = () => {
    setLocalError(undefined);
    setPreviewUrl(undefined);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const helperText = localError ?? error;

  return (
    <StyledWrap>
      <StyledLabel>{label}</StyledLabel>
      <StyledRow>
        <StyledPreview>
          {previewUrl ? <img src={previewUrl} alt="" /> : <Icon name="user" size={24} />}
        </StyledPreview>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          사진 선택
        </Button>
        {previewUrl ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
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
    </StyledWrap>
  );
};
