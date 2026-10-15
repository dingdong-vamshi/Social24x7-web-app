import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SocialDialog } from "../features/social/SocialDialog";
import { StoryViewer } from "../features/social/ExpandedSocial";
import type { Story } from "../features/social/extendedRepository";

afterEach(() => vi.useRealTimers());
describe("Original Social modal adaptation", () => {
  it("contains keyboard focus, closes on Escape and restores focus and scrolling", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    const view = render(
      <SocialDialog title="QA modal" close={close}>
        <input aria-label="Caption" />
        <button>Save</button>
      </SocialDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "QA modal" });
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(trigger.inert).toBe(true);
    fireEvent.keyDown(document, { key: "Tab" });
    expect(
      screen.getByRole("button", { name: "Close qa modal" }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(document.body.style.overflow).toBe("");
    expect(trigger.inert).not.toBe(true);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
  it("uses the original seven-second text/image duration and navigates without a write", () => {
    vi.useFakeTimers();
    const close = vi.fn();
    const story = {
      id: "1",
      author_id: "qa",
      content_type: "text",
      text_content: "First story",
      background_style: "forest",
      expires_at: "2099-01-01",
      author: { display_name: "QA" },
    } as Story;
    render(
      <MemoryRouter>
        <StoryViewer
          stories={[story, { ...story, id: "2", text_content: "Second story" }]}
          initial={0}
          base="/account/social"
          close={close}
        />
      </MemoryRouter>,
    );
    act(() => vi.advanceTimersByTime(6999));
    expect(screen.getByText("First story")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("Second story")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("First story")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous story" }));
    expect(close).toHaveBeenCalledOnce();
  });
  it("never renders expired story content", () => {
    const story = {
      id: "1",
      author_id: "qa",
      content_type: "text",
      text_content: "Expired private content",
      expires_at: "2000-01-01",
      author: null,
    } as Story;
    render(
      <MemoryRouter>
        <StoryViewer
          stories={[story]}
          initial={0}
          base="/account/social"
          close={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("This story has expired.")).toBeInTheDocument();
    expect(
      screen.queryByText("Expired private content"),
    ).not.toBeInTheDocument();
  });
});
