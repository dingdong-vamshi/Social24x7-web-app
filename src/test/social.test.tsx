import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mock = vi.hoisted(() => ({
  user: { id: "qa", app_metadata: {} as Record<string, string> },
  repo: {
    feed: vi.fn(),
    notifications: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    publish: vi.fn(),
    like: vi.fn(),
    search: vi.fn(),
    markRead: vi.fn(),
    mediaUrl: vi.fn(),
    profile: vi.fn(),
    following: vi.fn(),
    stories: vi.fn(),
    follow: vi.fn(),
    viewerId: 'qa',
  },
}));
vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: mock.user, loading: false, error: null }),
}));
vi.mock("../lib/supabase", () => ({ requireSupabase: () => ({}) }));
vi.mock("../features/social/repository", async (original) => ({
  ...(await original<object>()),
  createSocialRepository: () => mock.repo,
}));
vi.mock("../components/PublicNav", () => ({ PublicNav: () => null }));
import { Social } from "../pages/Social";
const mount = (path = "/partner/seller/social", standalone = false) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Social seller={!standalone} />
    </MemoryRouter>,
  );
const post = {
  id: "post",
  author_id: "author",
  author_display_name: "QA author",
  author_username: "qa",
  body: "Authorized test post",
  created_at: "2026-10-14T00:00:00Z",
  media_paths: [],
  like_count: 2,
  comment_count: 0,
  liked_by_viewer: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.user.app_metadata = {};
  mock.repo.feed.mockResolvedValue([post]);
  mock.repo.notifications.mockResolvedValue([]);
  mock.repo.publish.mockResolvedValue("new");
  mock.repo.search.mockResolvedValue([]);
  mock.repo.stories.mockResolvedValue([]);
});
describe("Social preserves existing personal boundaries", () => {
  it("loads canonical supplied feed and real empty notifications", async () => {
    mount('/account/social', true);
    expect(await screen.findByText("Authorized test post")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(
      await screen.findByText("You’re all caught up."),
    ).toBeInTheDocument();
    expect(mock.repo.markRead).not.toHaveBeenCalled();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
  it.each(['seller', 'creator'] as const)('owns one notification bell and no nested main on the distinct %s Social surface', async role => {
    const base = '/partner/' + role + '/social';
    render(<MemoryRouter initialEntries={[base]}><main><Social seller={role === 'seller'} creator={role === 'creator'} /></main></MemoryRouter>);
    expect(await screen.findByText('Authorized test post')).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Social content' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Notifications/ })).toHaveLength(1);
    expect(mock.repo.subscribe).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(await screen.findByText('You’re all caught up.')).toBeInTheDocument();
  });
  it("does not treat a failed feed as an empty feed", async () => {
    mock.repo.feed.mockRejectedValue(new Error("Feed unavailable"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Feed unavailable",
    );
    expect(screen.queryByText("No posts on this page")).not.toBeInTheDocument();
  });
  it("preserves unsaved post on error and supports retry", async () => {
    mock.repo.publish
      .mockRejectedValueOnce(new Error("Post not saved"))
      .mockResolvedValue("new");
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Create a new post" }));
    fireEvent.change(screen.getByLabelText("Share an update"), {
      target: { value: "QA draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish post" }));
    expect(await screen.findByText("Post not saved")).toBeInTheDocument();
    expect(screen.getByLabelText("Share an update")).toHaveValue("QA draft");
    fireEvent.click(screen.getByRole("button", { name: "Publish post" }));
    expect(
      await screen.findByText("Your public post has been published."),
    ).toBeInTheDocument();
  });
  it("does not report a successful like when its mutation fails", async () => {
    mock.repo.like.mockRejectedValue(new Error("Like denied"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /Like · 2/ }));
    expect(await screen.findByText("Like denied")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Like · 2/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
  it("searches existing Social contracts and shows no-result state", async () => {
    mount("/partner/seller/social?view=discover");
    fireEvent.change(screen.getByLabelText("Search Social"), {
      target: { value: "QA search" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(mock.repo.search).toHaveBeenCalledWith("QA search"),
    );
    expect(
      await screen.findByText("No matching people or posts."),
    ).toBeInTheDocument();
  });
  it("does not request personal Social data for employee identities", () => {
    mock.user.app_metadata = { account_type: "business_employee" };
    mount();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Employee work accounts",
    );
    expect(mock.repo.feed).not.toHaveBeenCalled();
  });
});
