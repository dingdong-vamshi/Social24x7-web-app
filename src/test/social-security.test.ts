import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSocialRepository,
  notificationDestination,
  type Notification,
} from "../features/social/repository";
function fixture(id = "qa", work = false) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const key of [
    "select",
    "eq",
    "is",
    "order",
    "limit",
    "update",
    "insert",
    "upsert",
    "delete",
    "single",
    "maybeSingle",
  ])
    query[key] = vi.fn(() => query);
  query.then = vi.fn((resolve: (r: unknown) => unknown) =>
    resolve({ data: [], error: null, count: 0 }),
  );
  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: {
            id,
            app_metadata: work ? { account_type: "business_employee" } : {},
          },
        },
        error: null,
      })),
    },
    from: vi.fn(() => query),
  };
  return {
    client,
    query,
    repo: createSocialRepository(client as unknown as SupabaseClient, "qa"),
  };
}
describe("Social authorization contracts", () => {
  it('marks all read only for the authenticated recipient and only previously unread rows', async () => {
    const f = fixture(); await f.repo.markAllRead();
    expect(f.query.eq).toHaveBeenCalledTimes(3); expect(f.query.is).toHaveBeenCalledTimes(3);
    for (const call of f.query.eq.mock.calls) expect(call).toEqual(['recipient_id','qa']);
    for (const call of f.query.is.mock.calls) expect(call).toEqual(['read_at',null]);
    const denied=fixture('other'); await expect(denied.repo.markAllRead()).rejects.toThrow('personal account session'); expect(denied.client.from).not.toHaveBeenCalled();
  });
  it.each([true, false])('only displays professional verification from the authorized public profile RPC: %s', async verified => {
    const rpc = vi.fn(async (name: string) => ({ data: name === 'get_social_feed' ? [{id:'post',author_id:'qa',author_verified_professional:true}] : name === 'get_public_social_profiles' ? [{id:'qa',verified_professional:verified}] : [], error:null }));
    const repo = createSocialRepository({rpc} as unknown as SupabaseClient,'qa');
    expect((await repo.feed())[0].author_verified_professional).toBe(verified);
    expect(rpc).toHaveBeenCalledWith('get_public_social_profiles',{target_ids:['qa']});
  });
  it('does not promote an author when verification lookup fails', async () => {
    const rpc = vi.fn(async (name: string) => ({ data: name === 'get_social_feed' ? [{id:'post',author_id:'qa',author_verified_professional:true}] : [], error:name === 'get_public_social_profiles' ? {message:'Unavailable'} : null }));
    const repo = createSocialRepository({rpc} as unknown as SupabaseClient,'qa');
    expect((await repo.feed())[0].author_verified_professional).toBe(false);
  });
  it.each([
    ["other", false],
    ["qa", true],
  ] as const)(
    "rejects a changed or work identity before writing",
    async (id, work) => {
      const f = fixture(id, work);
      await expect(f.repo.publish("test")).rejects.toThrow(
        "personal account session",
      );
      expect(f.client.from).not.toHaveBeenCalled();
    },
  );
  it("scopes every notification query to the current recipient", async () => {
    const f = fixture();
    await f.repo.notifications();
    expect(f.query.eq).toHaveBeenCalledTimes(3);
    for (const call of f.query.eq.mock.calls)
      expect(call).toEqual(["recipient_id", "qa"]);
  });
  it("scopes mark-read by both notification id and recipient", async () => {
    const f = fixture();
    await f.repo.markRead({ id: "n", source: "social" } as Notification);
    expect(f.client.from).toHaveBeenCalledWith("social_notifications");
    expect(f.query.eq).toHaveBeenCalledWith("id", "n");
    expect(f.query.eq).toHaveBeenCalledWith("recipient_id", "qa");
  });
  it("never follows an external notification destination", () => {
    expect(
      notificationDestination(
        { source: "chat", entityId: "https://evil.test" } as Notification,
        "/account/social",
      ),
    ).toBe("/account/social");
  });
  it("validates post and profile identifiers before querying", async () => {
    const f = fixture();
    await expect(f.repo.post("bad")).rejects.toThrow("Invalid post");
    await expect(f.repo.profile("bad")).rejects.toThrow("Invalid profile");
    expect(f.client.from).not.toHaveBeenCalled();
  });
});
