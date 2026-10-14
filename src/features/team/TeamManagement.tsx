import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CommerceEmpty,
  CommerceResult,
  useCommerce,
} from "../../components/LiveCommerce";
import {
  Button,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../../components/Ui";
import { requireSupabase } from "../../lib/supabase";
import { dateTime, label } from "../../repositories/commerce";
import { TeamChatMonitor } from "../chat/TeamChatMonitor";
import { createTeamRepository } from "./repository";
import { normalizeBusinessLoginId, validateTeamInvitation } from "./rules";
import type {
  TeamDashboard,
  TeamInvitationInput,
  TeamInvitationResult,
  TeamMember,
  TeamPermissionCode,
  TeamRole,
} from "./types";
import "./team.css";

type Action = {
  title: string;
  warning: string;
  execute: () => Promise<unknown>;
};
export function TeamManagement({ storefrontId }: { storefrontId: string }) {
  const repository = useMemo(() => createTeamRepository(requireSupabase()), []);
  const load = useCallback(
    async () => ({
      dashboard: await repository.getDashboard(storefrontId),
      metrics: await repository.getMetrics(storefrontId),
    }),
    [repository, storefrontId],
  );
  const result = useCommerce(load);
  const [editor, setEditor] = useState("");
  const [filter, setFilter] = useState("all");
  const [action, setAction] = useState<Action | null>(null);
  const [activation, setActivation] = useState<
    (TeamInvitationResult & { loginId: string }) | null
  >(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function run(execute: () => Promise<unknown>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await execute();
      setAction(null);
      setEditor("");
      result.refresh();
      setNotice(
        "The service recorded your change. Reloading the current team state.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The change could not be confirmed. Refresh before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="team-management">
      <PageHeader
        title="Team & verification"
        eyebrow="Business access"
        description="Manage separate work identities, permissions and assigned customer chats."
        actions={
          <Button variant="secondary" disabled={busy} onClick={result.refresh}>
            Refresh team
          </Button>
        }
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="commerce-success">
          {notice}
        </p>
      )}
      {activation && (
        <SectionCard
          title="Activation ready"
          description="Share privately with this employee. No email or SMS delivery is implied. The code expires and works once."
        >
          <p>
            Business login ID:{" "}
            <strong data-private>{activation.loginId}</strong>
          </p>
          <label>
            One-time activation code
            <input
              data-private
              type="password"
              readOnly
              value={activation.activationCode}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <p>
            Expires {dateTime(activation.expiresAt)}. Employee activates at{" "}
            <Link to="/business-activate">Create work password</Link>, then
            waits for owner approval.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard
                .writeText(
                  `SOCIAL 24-7 work login: ${activation.loginId}\nActivation code: ${activation.activationCode}\n${window.location.origin}/business-activate\nExpires: ${activation.expiresAt}`,
                )
                .then(() =>
                  setNotice(
                    "Activation instructions copied. Share only with this employee.",
                  ),
                )
                .catch(() =>
                  setError(
                    "Clipboard unavailable. Select the activation code to copy it manually.",
                  ),
                );
            }}
          >
            Copy private activation instructions
          </Button>
          <Button variant="ghost" onClick={() => setActivation(null)}>
            Dismiss and clear code
          </Button>
        </SectionCard>
      )}
      {action && (
        <SectionCard title={`Confirm ${action.title}`}>
          <p>{action.warning}</p>
          <div className="commerce-row-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void run(action.execute)}>
              {busy ? "Saving…" : `Confirm ${action.title}`}
            </Button>
          </div>
        </SectionCard>
      )}
      <CommerceResult result={result}>
        {({ dashboard, metrics }) => (
          <>
            <p>
              Business verification:{" "}
              <StatusPill>
                {label(dashboard.storefront.verificationStatus)}
              </StatusPill>
              . Employee approval is separate from business and professional
              Creator verification.
            </p>
            <div className="commerce-row-actions">
              <Button
                disabled={busy || !dashboard.storefront.verified}
                onClick={() => {
                  setEditor("invite");
                  setActivation(null);
                  setError("");
                }}
              >
                Invite employee
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setEditor("role:new")}
              >
                Create custom role
              </Button>
              <Link to="/business-login">Employee work login</Link>
            </div>
            {editor === "invite" && (
              <InviteEditor
                dashboard={dashboard}
                busy={busy}
                onCancel={() => setEditor("")}
                onSave={(input) =>
                  void run(async () => {
                    const next = await repository.invite(input);
                    setActivation({ ...next, loginId: input.loginId });
                  })
                }
              />
            )}
            <h2>Team members</h2>
            <label>
              Member status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {[
                  "all",
                  "not_activated",
                  "awaiting_approval",
                  "verified",
                  "suspended",
                  "removed",
                ].map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            {dashboard.members
              .filter((m) => filter === "all" || m.status === filter)
              .map((member) => {
                const metric = metrics.find(
                  (m) => m.membershipId === member.id,
                );
                return (
                  <SectionCard
                    key={member.id}
                    title={member.fullName}
                    description={`${member.jobTitle || member.roleName} · ${member.department}`}
                  >
                    <StatusPill>{label(member.status)}</StatusPill>
                    <p>
                      {member.customerTagline}{" "}
                      {member.representativeVerified &&
                        "· Verified representative"}
                    </p>
                    <p>
                      {metric
                        ? `${metric.openChats} open · ${metric.resolvedChats} resolved · ${metric.waitingForReply} waiting for reply`
                        : "Chat metrics unavailable"}
                    </p>
                    <details>
                      <summary>Identity and effective permissions</summary>
                      <p data-private>
                        Work login:{" "}
                        {member.loginId || "Owner personal identity"} ·{" "}
                        {member.workEmail}
                      </p>
                      <p>Role: {member.roleName}</p>
                      <ul>
                        {member.permissions.map((permission) => (
                          <li key={permission}>
                            {dashboard.permissionCatalog.find(
                              (p) => p.code === permission,
                            )?.label || label(permission)}
                          </li>
                        ))}
                      </ul>
                    </details>
                    {member.identityKind === "owner_personal" ? (
                      <p>The root Owner identity is protected.</p>
                    ) : (
                      <div className="commerce-row-actions">
                        {member.status !== "removed" && (
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setEditor(member.id)}
                          >
                            Edit member & permissions
                          </Button>
                        )}
                        {member.status === "not_activated" && (
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              setAction({
                                title: "new activation code",
                                warning:
                                  "This invalidates the previous code. Share the replacement privately; it does not send an email.",
                                execute: async () =>
                                  setActivation({
                                    ...(await repository.resend(member.id)),
                                    loginId: member.loginId,
                                  }),
                              })
                            }
                          >
                            Generate replacement code
                          </Button>
                        )}
                        {member.status === "awaiting_approval" && (
                          <Button
                            disabled={busy}
                            onClick={() =>
                              setAction({
                                title: "employee approval",
                                warning:
                                  "Approve only after verifying this employee and their assigned role. This enables work access.",
                                execute: () => repository.approve(member.id),
                              })
                            }
                          >
                            Approve employee
                          </Button>
                        )}
                        {(member.status === "verified" ||
                          member.status === "awaiting_approval") && (
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              setAction({
                                title: "suspension",
                                warning:
                                  "Access is revoked and assigned conversations are unassigned. History is preserved.",
                                execute: () =>
                                  repository.transition(member.id, "suspend"),
                              })
                            }
                          >
                            Suspend
                          </Button>
                        )}
                        {member.status === "suspended" && (
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              setAction({
                                title: "reactivation",
                                warning:
                                  "Restores this activated work identity to verified. Existing backend checks still apply.",
                                execute: () =>
                                  repository.transition(
                                    member.id,
                                    "reactivate",
                                  ),
                              })
                            }
                          >
                            Reactivate
                          </Button>
                        )}
                        {member.status !== "removed" && (
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              setAction({
                                title: "removal",
                                warning:
                                  "Removes work access and unassigns conversations. Chat history remains. There is no undo action for a removed membership.",
                                execute: () =>
                                  repository.transition(member.id, "remove"),
                              })
                            }
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                    {editor === member.id && (
                      <MemberEditor
                        member={member}
                        dashboard={dashboard}
                        busy={busy}
                        onCancel={() => setEditor("")}
                        onSave={(input) =>
                          void run(() => repository.updateMember(input))
                        }
                      />
                    )}
                  </SectionCard>
                );
              })}
            {!dashboard.members.some(
              (m) => filter === "all" || m.status === filter,
            ) && <CommerceEmpty title="No matching members" />}
            <SectionCard title="Roles & permissions">
              <div className="commerce-row-actions">
                {dashboard.roles.map((role) => (
                  <Button
                    key={role.id}
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setEditor(`role:${role.id}`)}
                  >
                    {role.name} · {role.usageCount} members
                  </Button>
                ))}
              </div>
              {editor.startsWith("role:") && (
                <RoleEditor
                  key={editor}
                  role={dashboard.roles.find((r) => `role:${r.id}` === editor)}
                  dashboard={dashboard}
                  busy={busy}
                  onCancel={() => setEditor("")}
                  onSave={(input) =>
                    void run(() =>
                      input.roleId
                        ? repository.updateRole({
                            ...input,
                            roleId: input.roleId,
                          })
                        : repository.createRole({ ...input, storefrontId }),
                    )
                  }
                  onArchive={(role) =>
                    setAction({
                      title: "role archive",
                      warning:
                        "Only unused custom roles can be archived. Built-in roles are protected.",
                      execute: () => repository.archiveRole(role.id),
                    })
                  }
                />
              )}
            </SectionCard>
            <TeamChatMonitor
              storefrontId={storefrontId}
              members={dashboard.members}
              allowAssignment
            />
            <SectionCard
              title="Recent security activity"
              description="Events returned by the existing team audit service."
            >
              {dashboard.auditEvents.length ? (
                dashboard.auditEvents.map((event) => (
                  <p key={event.id}>
                    {label(event.eventType)} · {dateTime(event.createdAt)}
                  </p>
                ))
              ) : (
                <p>No activity returned.</p>
              )}
            </SectionCard>
          </>
        )}
      </CommerceResult>
    </div>
  );
}

function Permissions({
  dashboard,
  selected,
  change,
  disabled,
}: {
  dashboard: TeamDashboard;
  selected: TeamPermissionCode[];
  change: (v: TeamPermissionCode[]) => void;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend>Effective permission override</legend>
      {dashboard.permissionCatalog.map((p) => (
        <label className="commerce-checkbox" key={p.code}>
          <input
            type="checkbox"
            checked={selected.includes(p.code)}
            onChange={(e) =>
              change(
                e.target.checked
                  ? [...selected, p.code]
                  : selected.filter((x) => x !== p.code),
              )
            }
          />
          <span>
            {p.label}
            <small>{p.description}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
function InviteEditor({
  dashboard,
  busy,
  onCancel,
  onSave,
}: {
  dashboard: TeamDashboard;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: TeamInvitationInput) => void;
}) {
  const roles = dashboard.roles.filter(
    (r) => r.systemKey !== "owner" && !r.archivedAt,
  );
  const [draft, setDraft] = useState<TeamInvitationInput>({
    storefrontId: dashboard.storefront.id,
    fullName: "",
    workEmail: "",
    loginId: "",
    customerTagline: `from ${dashboard.storefront.name}`,
    jobTitle: "",
    employeeId: "",
    department: "",
    roleId:
      roles.find((r) => r.systemKey === "agent")?.id || roles[0]?.id || "",
    permissions: null,
  });
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    const v = validateTeamInvitation(draft);
    if (!v.valid) {
      setError(v.errors.join(" "));
      return;
    }
    onSave({
      ...draft,
      loginId: v.loginId,
      workEmail: draft.workEmail.trim().toLowerCase(),
    });
  }
  return (
    <SectionCard
      title="Invite employee"
      description="Use the employee's authorized work email. This creates an invitation, not an approved account."
    >
      <form className="commerce-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="commerce-form-grid">
            {(
              [
                ["fullName", "Full name"],
                ["workEmail", "Work email"],
                ["loginId", "Business login ID"],
                ["customerTagline", "Customer tagline"],
                ["jobTitle", "Job title"],
                ["department", "Department"],
                ["employeeId", "Employee ID (optional)"],
              ] as const
            ).map(([key, title]) => (
              <label key={key}>
                {title}
                <input
                  required={key !== "employeeId"}
                  type={key === "workEmail" ? "email" : "text"}
                  maxLength={key === "loginId" ? 40 : 180}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]:
                        key === "loginId"
                          ? normalizeBusinessLoginId(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Role
            <select
              required
              value={draft.roleId}
              onChange={(e) => setDraft({ ...draft, roleId: e.target.value })}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Uses the selected role's permissions. Overrides can be reviewed in
            the member editor.
          </p>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className="commerce-row-actions">
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create invitation"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
function MemberEditor({
  member,
  dashboard,
  busy,
  onCancel,
  onSave,
}: {
  member: TeamMember;
  dashboard: TeamDashboard;
  busy: boolean;
  onCancel: () => void;
  onSave: (
    v: Parameters<ReturnType<typeof createTeamRepository>["updateMember"]>[0],
  ) => void;
}) {
  const [draft, setDraft] = useState({
    memberId: member.id,
    roleId: member.roleId,
    fullName: member.fullName,
    customerTagline: member.customerTagline,
    jobTitle: member.jobTitle,
    department: member.department,
    permissions: member.permissions,
  });
  return (
    <form
      className="commerce-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <fieldset disabled={busy}>
        <legend>Edit work identity</legend>
        <div className="commerce-form-grid">
          {(
            ["fullName", "customerTagline", "jobTitle", "department"] as const
          ).map((key) => (
            <label key={key}>
              {label(key.replace(/[A-Z]/g, (c) => " " + c.toLowerCase()))}
              <input
                required
                value={draft[key]}
                maxLength={180}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <label>
          Role
          <select
            value={draft.roleId}
            onChange={(e) =>
              setDraft({
                ...draft,
                roleId: e.target.value,
                permissions:
                  dashboard.roles.find((r) => r.id === e.target.value)
                    ?.permissions || [],
              })
            }
          >
            {dashboard.roles
              .filter((r) => r.systemKey !== "owner" && !r.archivedAt)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
      </fieldset>
      <Permissions
        dashboard={dashboard}
        selected={draft.permissions}
        change={(permissions) => setDraft({ ...draft, permissions })}
        disabled={busy}
      />
      <p>
        Changing role replaces the permission selection with that role's
        permissions. Review overrides before saving.
      </p>
      <div className="commerce-row-actions">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel edit
        </Button>
        <Button type="submit" disabled={busy}>
          Save member
        </Button>
      </div>
    </form>
  );
}
function RoleEditor({
  role,
  dashboard,
  busy,
  onCancel,
  onSave,
  onArchive,
}: {
  role?: TeamRole;
  dashboard: TeamDashboard;
  busy: boolean;
  onCancel: () => void;
  onSave: (v: {
    roleId?: string;
    name: string;
    description: string;
    permissions: TeamPermissionCode[];
  }) => void;
  onArchive: (role: TeamRole) => void;
}) {
  const [name, setName] = useState(role?.name || ""),
    [description, setDescription] = useState(role?.description || ""),
    [permissions, setPermissions] = useState(role?.permissions || []);
  if (role?.systemKey === "owner")
    return (
      <p>The Owner role is protected. Its permissions cannot be changed.</p>
    );
  return (
    <form
      className="commerce-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ roleId: role?.id, name, description, permissions });
      }}
    >
      <label>
        Role name
        <input
          required
          maxLength={80}
          disabled={busy || role?.isSystem}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Description
        <textarea
          disabled={busy}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <Permissions
        dashboard={dashboard}
        selected={permissions}
        change={setPermissions}
        disabled={busy}
      />
      <div className="commerce-row-actions">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancel role edit
        </Button>
        {role && !role.isSystem && (
          <Button
            variant="secondary"
            disabled={busy || role.usageCount > 0}
            onClick={() => onArchive(role)}
          >
            Archive role
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {role ? "Save role" : "Create role"}
        </Button>
      </div>
    </form>
  );
}
