import { useCallback, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { CommerceResult, useCommerce } from "../components/LiveCommerce";
import { Button, SectionCard } from "../components/Ui";
import { requireSupabase } from "../lib/supabase";
import { createOperationsRepository } from "../repositories/operations";

export function ProfileEditor() {
  const { user, refreshProfile } = useAuth();
  const load = useCallback(
    () => createOperationsRepository(requireSupabase()).profile(user!.id),
    [user],
  );
  const result = useCommerce(load);
  return (
    <CommerceResult result={result}>
      {(profile) => (
        <ProfileForm
          initial={{
            display_name: profile?.display_name || "",
            username: profile?.username || "",
            bio: profile?.bio || "",
          }}
          userId={user!.id}
          onSaved={() => {
            void refreshProfile();
            result.refresh();
          }}
        />
      )}
    </CommerceResult>
  );
}
function ProfileForm({
  initial,
  userId,
  onSaved,
}: {
  initial: { display_name: string; username: string; bio: string };
  userId: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createOperationsRepository(requireSupabase()).saveProfile(
        userId,
        draft,
      );
      setNotice("Shared profile saved.");
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Profile could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title="Edit shared profile"
      description="Changes appear on your existing account across app and web. Approval and work permissions are not editable."
    >
      <form className="commerce-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Display name
            <input
              required
              maxLength={100}
              value={draft.display_name}
              onChange={(e) =>
                setDraft({ ...draft, display_name: e.target.value })
              }
            />
          </label>
          <label>
            Username
            <input
              required
              maxLength={50}
              value={draft.username}
              onChange={(e) => setDraft({ ...draft, username: e.target.value })}
            />
          </label>
          <label>
            Bio
            <textarea
              maxLength={2000}
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </label>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <div className="commerce-row-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setDraft(initial)}
          >
            Reset unsaved edits
          </Button>
          <Button type="submit" disabled={busy}>
            Save profile
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
