import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoUploadField } from "./PhotoUploadField";

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
