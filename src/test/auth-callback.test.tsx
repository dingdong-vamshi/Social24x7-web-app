import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  state: {
    user: { id: "qa", app_metadata: {} },
    access: {
      seller_status: "draft",
      creator_status: "approved",
      admin_access: false,
    },
    loading: false,
    error: null,
  },
}));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => mocks.state }));
vi.mock("../lib/supabase", () => ({
  requireSupabase: () => ({
    auth: { getSession: mocks.getSession, getUser: mocks.getUser },
  }),
}));
import { AuthCallback } from "../pages/AuthCallback";
function mount(intent = "seller") {
  return render(
    <MemoryRouter initialEntries={["/auth/callback/" + intent]}>
      <Routes>
        <Route path="/auth/callback/:intent" element={<AuthCallback />} />
        <Route
          path="/partner/onboarding/seller"
          element={<h1>Seller application</h1>}
        />
        <Route path="/partner/creator" element={<h1>Creator Center</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({
    data: { session: { user: { id: "qa" } } },
    error: null,
  });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "qa" } },
    error: null,
  });
});
describe("confirmation callback", () => {
  it("resumes Seller intent after SDK session restoration", async () => {
    mount();
    expect(await screen.findByText("Seller application")).toBeInTheDocument();
    expect(mocks.getUser).toHaveBeenCalledTimes(1);
  });
  it("resolves approved Creator without redundant login or selection", async () => {
    mount("creator");
    expect(await screen.findByText("Creator Center")).toBeInTheDocument();
  });
  it("offers role-preserving sign-in when PKCE cannot transfer across browsers", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mount("creator");
    expect(
      await screen.findByText("Continue your account confirmation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Continue to sign in")).toHaveAttribute(
      "href",
      "/partner/login?role=creator",
    );
  });
  it("does not display token-bearing provider errors", async () => {
    mocks.getSession.mockRejectedValue(new Error("secret-code"));
    mount();
    expect(
      await screen.findByText("Continue your account confirmation"),
    ).toBeInTheDocument();
    expect(screen.queryByText("secret-code")).not.toBeInTheDocument();
  });
});
