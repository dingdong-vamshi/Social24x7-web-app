import { useCallback, useRef, useState } from "react";
import { CommerceResult, useCommerce } from "../components/LiveCommerce";
import { Button, PageHeader, SectionCard, StatusPill } from "../components/Ui";
import { assertAdmin } from "../repositories/admin";
import { label } from "../repositories/commerce";

export type ModeratedProduct = {
  id: string;
  title: string;
  status: string;
  product_approval_status: string;
  review_note: string | null;
};
const productModeration = {
  async list(): Promise<ModeratedProduct[]> {
    const client = await assertAdmin();
    const r = await client
      .from("products")
      .select("id,title,status,product_approval_status,review_note")
      .in("product_approval_status", ["approved", "suspended"])
      .order("updated_at", { ascending: false })
      .limit(500);
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  },
  async review(product: ModeratedProduct, reason: string) {
    if (!["approved", "suspended"].includes(product.product_approval_status))
      throw new Error("Product is not eligible for moderation.");
    if (product.product_approval_status === "approved" && !reason.trim())
      throw new Error("A suspension reason is required.");
    const client = await assertAdmin();
    const r = await client.rpc("review_creator_commerce_product", {
      p_product_id: product.id,
      p_decision:
        product.product_approval_status === "approved"
          ? "suspended"
          : "approved",
      p_reason: reason.trim() || null,
    });
    if (r.error) throw new Error(r.error.message);
  },
};
export function AdminProducts() {
  const load = useCallback(() => productModeration.list(), []),
    result = useCommerce(load);
  const [selected, setSelected] = useState<ModeratedProduct | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  async function confirm() {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await productModeration.review(selected, reason);
      setSelected(null);
      setNotice("Product moderation recorded. Reloading current status.");
      result.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Decision not confirmed.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Product moderation"
        description="The current backend permits suspending published products and reinstating suspended products. There is no pre-publication Admin approval queue."
        actions={
          <Button variant="secondary" onClick={result.refresh}>
            Refresh products
          </Button>
        }
      />
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {selected && (
        <SectionCard
          title={
            selected.product_approval_status === "approved"
              ? "Confirm product suspension"
              : "Confirm product reinstatement"
          }
        >
          <p>
            This changes the real product's availability. Do not use this to
            manufacture QA results.
          </p>
          <label>
            Reviewer reason
            <textarea
              value={reason}
              disabled={busy}
              maxLength={4000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="commerce-row-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Cancel moderation
            </Button>
            <Button
              disabled={
                busy ||
                (selected.product_approval_status === "approved" &&
                  !reason.trim())
              }
              onClick={() => void confirm()}
            >
              Confirm moderation
            </Button>
          </div>
        </SectionCard>
      )}
      <CommerceResult result={result}>
        {(rows) =>
          rows.length ? (
            rows.map((row) => (
              <SectionCard key={row.id} title={row.title}>
                <StatusPill>{label(row.product_approval_status)}</StatusPill>
                <p>{row.review_note || "No review note recorded."}</p>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setSelected(row);
                    setReason("");
                    setError("");
                  }}
                >
                  {row.product_approval_status === "approved"
                    ? "Suspend product"
                    : "Reinstate product"}
                </Button>
              </SectionCard>
            ))
          ) : (
            <p>No products available for moderation.</p>
          )
        }
      </CommerceResult>
      <p>Showing up to 500 latest eligible products.</p>
    </>
  );
}
