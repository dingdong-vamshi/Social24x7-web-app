import { isAuthOrigin } from '../lib/domains';
export type PartnerIntent = "seller" | "creator";
type Access = {
  admin_access?: boolean;
  seller_status?: string;
  creator_status?: string;
} | null;
export type Workspace = "admin" | "seller" | "creator" | "consumer";
export function partnerIntent(value: string | null): PartnerIntent | null {
  return value === "seller" || value === "creator" ? value : null;
}
export function safeNext(value: string | null, fallback = "/partner") {
  if (
    !value ||
    value.split(/[?#]/)[0].split("/").includes("..") ||
    /[\\\\\s%]/.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return fallback;
  return /^\/(?:partner\/(?:seller|creator|admin|onboarding\/(?:seller|creator)|application)(?:[/?#]|$)|application(?:[?#]|$)|account(?:[/?#]|$))/.test(
    value,
  )
    ? value
    : fallback;
}
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}
export const workspacePath = (workspace: Workspace) =>
  workspace === "consumer" ? "/account/chats" : `/partner/${workspace}`;
export function allowedWorkspace(
  workspace: string | null,
  access: Access,
): workspace is Workspace {
  return (
    workspace === "consumer" ||
    (workspace === "admin"
      ? access?.admin_access === true
      : (workspace === "seller" || workspace === "creator") &&
        access?.[`${workspace}_status`] === "approved")
  );
}
export function rememberWorkspace(userId: string, workspace: Workspace) {
  try {
    sessionStorage.setItem(`workspace:${userId}`, workspace);
  } catch {
    /* Storage is optional. */
  }
}
export function forgetWorkspace(userId: string | null) {
  if (userId)
    try {
      sessionStorage.removeItem(`workspace:${userId}`);
    } catch {
      /* Storage is optional. */
    }
}
export function roleDestination(role: PartnerIntent, access: Access) {
  const status = access?.[`${role}_status`] || "not_applied";
  if (status === "approved") return `/partner/${role}`;
  if (
    ["not_applied", "draft", "more_information_required", "rejected"].includes(
      status,
    )
  )
    return `/partner/onboarding/${role}`;
  return `/application?role=${role}`;
}
export function roleAction(role: PartnerIntent, access: Access) {
  const title = role === "seller" ? "Seller" : "Creator",
    status = access?.[`${role}_status`] || "not_applied";
  if (status === "approved")
    return `Switch to ${title} ${role === "seller" ? "Studio" : "Center"}`;
  if (status === "not_applied") return `Become a ${title}`;
  if (status === "draft") return `Continue ${title} Application`;
  if (["more_information_required", "rejected"].includes(status))
    return `Update ${title} Application`;
  return `View ${title} Application Status`;
}
export function defaultDestination(userId: string, access: Access) {
  if (access?.admin_access) return "/partner/admin";
  let preferred: string | null = null;
  try {
    preferred = sessionStorage.getItem(`workspace:${userId}`);
  } catch {
    /* Storage is optional. */
  }
  if (
    (preferred === "seller" || preferred === "creator") &&
    allowedWorkspace(preferred, access)
  )
    return workspacePath(preferred);
  if (access?.seller_status === "approved") return "/partner/seller";
  if (access?.creator_status === "approved") return "/partner/creator";
  for (const role of ["seller", "creator"] as const)
    if (
      access?.[`${role}_status`] &&
      access[`${role}_status`] !== "not_applied"
    )
      return roleDestination(role, access);
  return "/partner";
}
export function loginDestination(
  userId: string,
  access: Access,
  requested: string | null,
  intent: PartnerIntent | null = null,
) {
  if (access?.admin_access) return "/partner/admin";
  if (intent) return roleDestination(intent, access);
  const fallback = defaultDestination(userId, access),
    next = safeNext(requested, fallback);
  const role = next.match(
    /^\/partner\/(?:onboarding\/)?(seller|creator)(?:\/|\?|$)/,
  )?.[1] as PartnerIntent | undefined;
  if (
    role &&
    (next.includes("/onboarding/") || access?.[`${role}_status`] !== "approved")
  )
    return roleDestination(role, access);
  return next.startsWith("/partner/admin") ? fallback : next;
}
export function confirmationUrl(
  origin: string,
  role: PartnerIntent | null,
  development = false,
) {
  const allowed = isAuthOrigin(origin, development);
  if (!allowed)
    throw new Error(
      "Registration is not enabled on this hostname. Use the verified Partner website.",
    );
  return `${origin}/auth/callback/${role || "partner"}`;
}
