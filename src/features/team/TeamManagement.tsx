import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { validateTeamInvitation } from "./rules";
import { CustomerIdentityPreview, MemberMetrics, TeamCounts, TeamDialog, TeamRoster, TeamSteps } from './TeamPresentation';
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
export function TeamManagement({ storefrontId, canMonitor = true, canAssign = true }: { storefrontId: string; canMonitor?: boolean; canAssign?: boolean }) {
  const [params, setParams] = useSearchParams();
  const selectedMember = params.get('member') || '';
  const [memberView, setMemberView] = useState<'chats' | 'profile'>('chats');
  function openMember(id: string) {
    setEditor('');
    setError('');
    setMemberView('chats');
    setParams(previous => { const next = new URLSearchParams(previous); if (id) next.set('member', id); else next.delete('member'); return next; });
  }
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
  const [search, setSearch] = useState("");
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
        "Change saved. The service recorded your update; refreshing the team.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? friendlyTeamError(cause.message)
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
        description="Your employees, their work access and customer conversations."
        actions={
          <Button variant="secondary" disabled={busy} onClick={result.refresh}>
            Refresh team
          </Button>
        }
      />
      {error && !editor && !action && (
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
        <TeamDialog onClose={() => setActivation(null)}
          title="Activation ready"
        >
          <p>{activation.emailStatus === 'accepted' ? 'The email provider accepted this invitation. This does not confirm inbox delivery; check provider delivery events. No SMS was sent.' : activation.emailStatus === 'failed' ? 'The invitation was created, but email delivery was not confirmed. Share these instructions privately; do not create a duplicate employee.' : 'Share privately with this employee. No email or SMS has been sent.'} The code expires and works once.</p>
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
        </TeamDialog>
      )}
      {action && (
        <TeamDialog title={`Confirm ${action.title}`} onClose={() => setAction(null)} busy={busy}>
          <p>{action.warning}</p>
          {error && <p role="alert" className="form-error">{error}</p>}
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
        </TeamDialog>
      )}
      <CommerceResult result={{ ...result, error: result.error ? friendlyTeamError(result.error) : undefined }}>
        {({ dashboard, metrics }) => (
          <>
            <div className="team-business-heading"><div><h2>{dashboard.storefront.name}</h2><p>Business verification: <StatusPill>{label(dashboard.storefront.verificationStatus)}</StatusPill></p></div><p>Only approved employees of a verified business can represent you in assigned customer chats.</p></div>
            {!selectedMember && <><TeamSteps/><TeamCounts dashboard={dashboard} selected={filter} onSelect={setFilter}/></>}
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
              {!selectedMember && <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setEditor("role:new")}
              >
                Create custom role
              </Button>}
              <Link to="/business-login">Employee work login</Link>
            </div>
            {editor === "invite" && <TeamDialog title="Invite employee" onClose={() => setEditor('')} busy={busy}>
              {error && <p role="alert" className="form-error">{error}</p>}
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
            </TeamDialog>}
            {!selectedMember && <>
            <h2>Team members</h2>
            <p>Open an employee to review their identity, access and customer chats.</p>
            <div className="team-roster-filters">
            <label>
              Find team member
              <input type="search" value={search} placeholder="Name, Work login, employee ID or role" onChange={(event) => setSearch(event.target.value)} />
            </label>
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
            </div>
            <TeamRoster members={dashboard.members.filter(m => matchesMember(m, filter, search))} metrics={metrics} onOpen={openMember}/>
            {!dashboard.members.some(m => matchesMember(m, filter, search)) && <CommerceEmpty title="No matching members"/>}
            </>}
            {selectedMember && <Button variant="secondary" onClick={() => openMember('')}>← Back to team members</Button>}
            {selectedMember && !dashboard.members.some(m => m.id === selectedMember) && <CommerceEmpty title="Member unavailable" description="This member is not available in the selected business. Return to the team list."/>}
            {dashboard.members
              .filter((m) => m.id === selectedMember)
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
                    <MemberMetrics metric={metric}/>
                    <p className="team-help">Open, resolved, currently assigned and waiting counts cover current assignments. Recorded lifetime chats also includes retained previous assignments.</p>
                    <nav className="commerce-row-actions" aria-label="Member sections">
                      <button className="button secondary" type="button" aria-pressed={memberView === 'chats'} onClick={() => setMemberView('chats')}>Customer chats</button>
                      <button className="button secondary" type="button" aria-pressed={memberView === 'profile'} onClick={() => setMemberView('profile')}>Profile & access</button>
                    </nav>
                    <div hidden={memberView !== 'profile'}><details open>
                      <summary>Identity and effective permissions</summary>
                      <p data-private>
                        Work login:{" "}
                        {member.loginId || "Owner personal identity"} ·{" "}
                        {member.workEmail}
                      </p>
                      <p>Role: {member.roleName}</p>
                      <p>Employee ID: {member.employeeId || "Not assigned"}</p>
                      <p>{member.identityKind === "owner_personal" ? "Owner access follows the protected personal owner identity." : member.status === "verified" && dashboard.storefront.verified ? "Work access enabled for the configured permissions and assigned conversations only." : "Work access disabled. Configured permissions below do not override membership or business verification status."}</p>
                      <dl className="team-lifecycle">
                        <div><dt>Invited / created</dt><dd>{member.createdAt ? dateTime(member.createdAt) : "Not recorded"}</dd></div>
                        <div><dt>Work activation</dt><dd>{member.activatedAt ? dateTime(member.activatedAt) : "Not activated"}</dd></div>
                        <div><dt>Owner approval</dt><dd>{member.approvedAt ? dateTime(member.approvedAt) : "Not approved"}</dd></div>
                      </dl>
                      {!member.permissions.length && <p>No permissions configured.</p>}
                      <ul>
                        {member.permissions.map((permission) => (
                          <li key={permission}>
                            {dashboard.permissionCatalog.find(
                              (p) => p.code === permission,
                            )?.label || label(permission)}
                          </li>
                        ))}
                      </ul>
                    </details><CustomerIdentityPreview name={member.fullName} tagline={member.customerTagline} company={dashboard.storefront.name} verified={member.representativeVerified}/></div>
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
                          <Button variant="secondary" disabled={busy} onClick={() => setAction({ title: 'email replacement invitation', warning: 'Requires a configured email provider. This invalidates the previous code and emails the replacement to the saved work email. No password is changed and no approval is granted.', execute: async () => setActivation({ ...(await repository.resend(member.id, storefrontId)), loginId: member.loginId }) })}>Email replacement invitation</Button>
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
                    {editor === member.id && <TeamDialog title={`Edit ${member.fullName}`} onClose={() => setEditor('')} busy={busy}>
                      {error && <p role="alert" className="form-error">{error}</p>}
                      <MemberEditor
                        member={member}
                        dashboard={dashboard}
                        busy={busy}
                        onCancel={() => setEditor("")}
                        onSave={(input) =>
                          void run(() => repository.updateMember(input))
                        }
                      />
                    </TeamDialog>}
                    {memberView === 'chats' && (canMonitor ? <TeamChatMonitor key={member.id} storefrontId={storefrontId} members={dashboard.members} initialMemberId={member.id} lockMember allowAssignment={canAssign}/> : <p>Conversation monitoring is not included in your permissions.</p>)}
                  </SectionCard>
                );
              })}
            {!selectedMember && <>
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
              {editor.startsWith("role:") && <TeamDialog title={editor === 'role:new' ? 'Create custom role' : 'Role & permissions'} onClose={() => setEditor('')} busy={busy}>
                {error && <p role="alert" className="form-error">{error}</p>}
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
              </TeamDialog>}
            </SectionCard>
            {canMonitor && <TeamChatMonitor
              storefrontId={storefrontId}
              members={dashboard.members}
              allowAssignment={canAssign}
            />}
            </>}
            <SectionCard
              title="Recent security activity"
              description="Invitations, approvals, access changes and customer assignments. History stays when someone leaves."
            >
              {dashboard.auditEvents.length ? (
                <details open><summary>View activity history</summary><div className="team-activity">{dashboard.auditEvents.filter(event => !selectedMember || event.membershipId === selectedMember).map((event) => (
                  <p key={event.id}>
                    {label(event.eventType)} · {event.membershipId ? dashboard.members.find((member) => member.id === event.membershipId)?.fullName || "Historical member" : "Storefront team"} · {dateTime(event.createdAt)}
                  </p>
                ))}</div></details>
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

function matchesMember(member: TeamMember, status: string, search: string) {
  return (status === "all" || member.status === status) &&
    [member.fullName, member.loginId, member.employeeId, member.roleName, member.department]
      .some((value) => (value || "").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
}

function friendlyTeamError(message: string) {
  if (/permission required|permission denied|access denied|not authorized|access revoked/i.test(message)) return 'Access revoked or not permitted. Refresh the team and ask your business owner to check your access.';
  if (/duplicate|already exists|already in use|unique constraint/i.test(message)) return 'That Work login or role name is already in use. Choose another and try again.';
  if (/schema|function|rpc|relation|constraint|SQL|PGRST|stack/i.test(message)) return 'The team service could not complete this change. Refresh before retrying; contact support if it continues.';
  if (/fetch|network|timeout/i.test(message)) return 'Connection interrupted. Refresh and check the team before retrying this change.';
  return message;
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
      <legend>Employee permissions</legend>
      {[
        ['Customer service', ['business_chat_reply', 'business_share_products_orders', 'business_returns_refunds', 'business_team_manage']],
        ['Supervision & company access', ['business_chat_monitor', 'business_chat_assign', 'business_feed_view', 'business_orders_view']],
      ].map(([group, codes]) => <div className="team-permission-group" key={String(group)}><h4>{group}</h4><div className="team-permission-options">{dashboard.permissionCatalog.filter(p => codes.includes(p.code)).sort((a,b) => codes.indexOf(a.code) - codes.indexOf(b.code)).map((p) => (
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
            {['business_share_products_orders', 'business_returns_refunds'].includes(p.code) && <small className="team-permission-warning">Requires an open assigned conversation and the operational backend contracts. Return approval queues processing; it never transfers money.</small>}
            {['business_team_manage', 'business_chat_assign', 'business_returns_refunds'].includes(p.code) && <small className="team-permission-warning">Sensitive access — grant only when needed.</small>}
          </span>
        </label>
      ))}</div></div>)}
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
    department: "Customer support",
    roleId:
      roles.find((r) => r.systemKey === "agent")?.id || roles[0]?.id || "",
    permissions: null,
  });
  const [error, setError] = useState("");
  const [customDepartment, setCustomDepartment] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => requireSupabase().functions.invoke('team-invitation-email', { body: { action: 'capabilities' } })).then(({ data, error }) => {
      if (active && !error && data?.configured === true) { setEmailAvailable(true); setDraft(v => ({ ...v, emailInvitation: true })); }
    }).catch(() => { /* Private delivery remains available when the adapter is not deployed. */ });
    return () => { active = false; };
  }, []);
  const rolePermissions = roles.find(role => role.id === draft.roleId)?.permissions || [];
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
    <>
      <p>Create a separate Work login. The employee sets their own password; you approve access after reviewing their identity.</p>
      <div className="team-invite-layout">
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
                ["employeeId", "Employee ID (optional)"],
              ] as const
            ).map(([key, title]) => (
              <label key={key}>
                {title}
                <input
                  required={key !== "employeeId"}
                  aria-label={title}
                  type={key === "workEmail" ? "email" : "text"}
                  maxLength={key === "loginId" ? 40 : key === "fullName" ? 100 : 180}
                  pattern={key === 'loginId' ? '[a-zA-Z0-9][a-zA-Z0-9._-]{2,39}' : undefined}
                  autoComplete={key === 'workEmail' || key === 'loginId' ? 'off' : undefined}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]: e.target.value,
                    })
                  }
                />
                {key === 'fullName' && <small>Use the employee’s real name or verified ID name.</small>}
                {key === 'loginId' && <small>3–40 letters, numbers, dots, dashes or underscores. This is not an email address.</small>}
              </label>
            ))}
          </div>
          <label>Department<select value={customDepartment ? 'custom' : draft.department} onChange={event => { setCustomDepartment(event.target.value === 'custom'); setDraft({ ...draft, department: event.target.value === 'custom' ? '' : event.target.value }); }}>
            {['Customer support', 'Sales', 'Relationship management', 'Cards & payments', 'Logistics', 'Marketing'].map(name => <option key={name}>{name}</option>)}
            <option value="custom">Custom department…</option>
          </select></label>
          {customDepartment && <label>Custom department<input required maxLength={100} value={draft.department} onChange={event => setDraft({ ...draft, department: event.target.value })}/></label>}
          <label>
            Role
            <select
              required
              value={draft.roleId}
              onChange={(e) => setDraft({ ...draft, roleId: e.target.value, permissions: null })}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <p>Choosing a role loads its current permissions. You can adjust them for this employee.</p>
          {emailAvailable ? <label><input type="checkbox" checked={draft.emailInvitation === true} onChange={e => setDraft({ ...draft, emailInvitation: e.target.checked })}/>Email activation instructions automatically to the work email</label> : <p className="team-help">Automatic email is not configured. Create an invitation and share the one-time instructions privately.</p>}
        </fieldset>
        <Permissions dashboard={dashboard} selected={draft.permissions ?? rolePermissions} change={permissions => setDraft({ ...draft, permissions })} disabled={busy}/>
        <p className="team-help">{draft.permissions === null ? 'Using role defaults.' : 'Using an employee-specific permission selection.'} These permissions take effect only after activation and approval.</p>
        {draft.permissions !== null && <Button variant="ghost" disabled={busy} onClick={() => setDraft({ ...draft, permissions: null })}>Reset to role defaults</Button>}
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
      <CustomerIdentityPreview name={draft.fullName} tagline={draft.customerTagline} company={dashboard.storefront.name} preview/>
      </div>
    </>
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
        permissions. Review before saving. This does not change activation or verification status.
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
      {role && <p>Changes apply to {role.usageCount} current member{role.usageCount === 1 ? '' : 's'} using this role, except where an employee-specific permission overrides the role. Review sensitive access before saving.</p>}
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
