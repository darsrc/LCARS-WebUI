import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { FileUploadWidget } from "../types/contract";
import { FileUploadControl } from "./FileUploadControl";

const widget = (patch: Partial<FileUploadWidget> = {}): FileUploadWidget => ({
  id: "training-upload",
  type: "file_upload",
  label: "Training Data",
  action_id: "receive-training",
  upload_url: "/lcars/upload/files",
  accept: [".json"],
  multiple: true,
  max_files: 2,
  max_bytes: 1024,
  ...patch,
});

describe("FileUploadControl", () => {
  it("selects accepted files and reports upload progress", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn(async (_widget, files, onProgress) => {
      expect(files[0].name).toBe("dataset.json");
      onProgress?.(64);
    });
    render(<FileUploadControl onUpload={onUpload} widget={widget()} />);

    await user.upload(
      screen.getByLabelText("Training Data"),
      new File(["{}"], "dataset.json", { type: "application/json" }),
    );

    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("1 file transferred")).toBeInTheDocument();
    expect(screen.getByText("dataset.json")).toBeInTheDocument();
  });

  it("rejects unsupported and oversized files before transport", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const { rerender } = render(<FileUploadControl onUpload={onUpload} widget={widget()} />);

    fireEvent.drop(screen.getByRole("button", { name: /Training Data/i }), {
      dataTransfer: {
        files: [new File(["plain"], "notes.txt", { type: "text/plain" })],
      },
    });
    expect(await screen.findByText(/not an accepted file type/i)).toBeInTheDocument();

    rerender(
      <FileUploadControl
        onUpload={onUpload}
        widget={widget({ accept: [], max_bytes: 2 })}
      />,
    );
    await user.upload(
      screen.getByLabelText("Training Data"),
      new File(["large"], "dataset.json", { type: "application/json" }),
    );
    expect(await screen.findByText(/exceeds 2 B/i)).toBeInTheDocument();
    expect(onUpload).not.toHaveBeenCalled();
  });
});
