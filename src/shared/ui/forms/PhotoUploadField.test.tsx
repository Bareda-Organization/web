import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoUploadField } from "./PhotoUploadField";
import { setAccessToken } from "../../lib/http";

// FE-R2 W 목표 2 — PhotoUploadField 가 미리보기용 blob: URL 을 해제하지 않아 화면을 오래
// 쓰면 메모리가 쌓이던 것을 고쳤다. jsdom 은 URL.createObjectURL/revokeObjectURL 을
// 구현하지 않아 여기서 직접 스텁한다.
const jpegFile = () => new File(["fake-image-bytes"], "photo.jpg", { type: "image/jpeg" });

describe("PhotoUploadField — blob: URL 해제", () => {
  beforeEach(() => {
    let counter = 0;
    URL.createObjectURL = vi.fn(() => `blob:mock-${++counter}`);
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("파일을 교체하면 직전 blob: URL 을 해제한다", () => {
    const onChange = vi.fn();
    render(<PhotoUploadField onChange={onChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [jpegFile()] } });
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { files: [jpegFile()] } });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
  });

  it("제거를 누르면 만든 blob: URL 을 해제한다", () => {
    const onChange = vi.fn();
    render(<PhotoUploadField onChange={onChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [jpegFile()] } });
    fireEvent.click(screen.getByText("제거"));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
  });

  it("언마운트하면 마지막으로 만든 blob: URL 을 해제한다", () => {
    const onChange = vi.fn();
    const { unmount } = render(<PhotoUploadField onChange={onChange} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [jpegFile()] } });
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-1");
  });

  it("기존 서버 사진 URL(existingPhotoUrl)은 blob: 이 아니므로 언마운트해도 해제하지 않는다", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <PhotoUploadField onChange={onChange} existingPhotoUrl="https://cdn.example.com/photo.jpg" />,
    );

    unmount();

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

// Ruling 377 — 기존 사진이 상대 경로면 토큰을 실어 받아 blob: URL 로 그린다. 실패하면 사진 없음 표시.
describe("PhotoUploadField — 보호된 기존 사진", () => {
  const okImage = () =>
    ({ ok: true, status: 200, blob: async () => new Blob(["x"], { type: "image/jpeg" }) }) as Response;
  const notFound = () =>
    ({ ok: false, status: 404, json: async () => ({ error: { code: "STUDENT_NOT_FOUND", message: "없음" } }) }) as Response;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:existing");
    URL.revokeObjectURL = vi.fn();
    setAccessToken("tok-2");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessToken(null);
  });

  it("상대 경로 기존 사진을 Bearer 토큰으로 받아 미리보기에 그린다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okImage());
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<PhotoUploadField onChange={vi.fn()} existingPhotoUrl="/api/v1/files/photos/a.jpg" />);

    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
    expect(container.querySelector("img")?.getAttribute("src")).toContain("blob:existing");
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe("Bearer tok-2");
  });

  it("받기에 실패하면 이미지 없이 대체 아이콘 상태로 남는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(notFound());
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<PhotoUploadField onChange={vi.fn()} existingPhotoUrl="/api/v1/files/photos/a.jpg" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByText("제거")).toBeNull();
  });
});
