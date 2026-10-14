import { beforeEach, describe, expect, it } from "vitest";
import {
  confirmationUrl,
  defaultDestination,
  loginDestination,
  partnerIntent,
  roleAction,
  roleDestination,
  safeNext,
} from "../auth/routing";
beforeEach(() => sessionStorage.clear());
describe("client-confirmed Partner intent", () => {
  it.each(["seller", "creator"] as const)(
    "%s maps each real status without a selector",
    (role) => {
      for (const status of [
        "not_applied",
        "draft",
        "rejected",
        "more_information_required",
      ])
        expect(roleDestination(role, { [role + "_status"]: status })).toBe(
          "/partner/onboarding/" + role,
        );
      for (const status of ["submitted", "under_review", "suspended"])
        expect(roleDestination(role, { [role + "_status"]: status })).toBe(
          "/application?role=" + role,
        );
      expect(roleDestination(role, { [role + "_status"]: "approved" })).toBe(
        "/partner/" + role,
      );
    },
  );
  it("intent beats saved dashboard preference, without granting approval", () => {
    sessionStorage.setItem("workspace:qa", "seller");
    expect(
      loginDestination(
        "qa",
        { seller_status: "approved", creator_status: "draft" },
        null,
        "creator",
      ),
    ).toBe("/partner/onboarding/creator");
  });
  it("never chooses the generic selector or automatically pairs a Customer", () => {
    sessionStorage.setItem("workspace:qa", "consumer");
    expect(
      defaultDestination("qa", {
        seller_status: "approved",
        creator_status: "approved",
      }),
    ).toBe("/partner/seller");
    expect(defaultDestination("qa", null)).toBe("/partner");
  });
  it("provides status-aware switching labels", () => {
    expect(roleAction("creator", { creator_status: "draft" })).toBe(
      "Continue Creator Application",
    );
    expect(roleAction("creator", { creator_status: "approved" })).toBe(
      "Switch to Creator Center",
    );
    expect(roleAction("seller", { seller_status: "submitted" })).toBe(
      "View Seller Application Status",
    );
  });
  it("preserves intent in exact first-party callback paths", () => {
    for (const role of ["seller", "creator"] as const)
      expect(
        confirmationUrl("https://social24x7-web-app.vercel.app", role),
      ).toBe("https://social24x7-web-app.vercel.app/auth/callback/" + role);
  });
  it("rejects unverified origins and query redirect tricks", () => {
    for (const origin of [
      "https://evil.example",
      "https://social24-7.com",
      "https://social24x7-web-app.vercel.app.evil.example",
    ])
      expect(() => confirmationUrl(origin, "seller")).toThrow();
    expect(partnerIntent("admin")).toBeNull();
    expect(safeNext("/%2fexample.com")).toBe("/partner");
    expect(safeNext("/auth/callback/seller")).toBe("/partner");
  });
});
