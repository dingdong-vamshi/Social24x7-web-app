import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loginDestination, partnerIntent } from "../auth/routing";
import { requireSupabase } from "../lib/supabase";
import { Brand } from "../components/Brand";

export function AuthCallback() {
  const auth = useAuth();
  const { intent } = useParams();
  const role = partnerIntent(intent || null);
  const [state, setState] = useState<"waiting" | "ready" | "error">("waiting");
  useEffect(() => {
    let active = true;
    // supabase-js owns URL detection and PKCE exchange. getSession waits for
    // initialization; do not exchange the same one-time code a second time.
    void (async () => {
      try {
        const client = requireSupabase();
        const { data, error } = await client.auth.getSession();
        if (error || !data.session) throw new Error("Session unavailable");
        const verified = await client.auth.getUser();
        if (verified.error || !verified.data.user)
          throw new Error("Invalid session");
        if (active) setState("ready");
      } catch {
        if (active) setState("error");
      } finally {
        // Never retain auth codes/errors/tokens in browser history or UI.
        window.history.replaceState(null, "", window.location.pathname);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  if (state === "ready" && auth.user && !auth.loading && !auth.error)
    return (
      <Navigate
        replace
        to={
          auth.user.app_metadata?.account_type === "business_employee"
            ? "/business-workspace"
            : loginDestination(auth.user.id, auth.access, null, role)
        }
      />
    );
  const failed = state === "error" || Boolean(auth.error);
  return (
    <main className="confirmation-page">
      <Brand />
      <h1>
        {failed
          ? "Continue your account confirmation"
          : "Opening your account…"}
      </h1>
      {failed ? (
        <>
          <p>
            The link may have expired, already been used, or opened in a
            different browser. If your email is confirmed, sign in to continue
            your {role || "Partner"} application.
          </p>
          <p>No application has been submitted or approved.</p>
          <Link
            className="button primary"
            to={`/partner/login${role ? "?role=" + role : ""}`}
          >
            Continue to sign in
          </Link>
          <Link to={`/partner/register${role ? "?role=" + role : ""}`}>
            Back to registration
          </Link>
        </>
      ) : (
        <p role="status">
          Securely restoring your session and checking your workspace
          permissions.
        </p>
      )}
    </main>
  );
}
