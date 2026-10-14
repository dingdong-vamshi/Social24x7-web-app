import { useState } from "react";
import { Button, SectionCard } from "../components/Ui";
import { commerce, type Product } from "../repositories/commerce";

export function ProductMediaEditor({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: () => void;
}) {
  const original = [...product.product_media].sort(
    (a, b) => a.position - b.position,
  );
  const [items, setItems] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const legacy = original.some(
    (item) => item.storage_bucket !== "product-media",
  );
  function move(index: number, direction: number) {
    const next = [...items];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setItems(next);
    setConfirm(false);
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await commerce.arrangeProductImages(
        product.id,
        items.map((item) => item.path),
        original.map((item) => item.path),
      );
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Image change not confirmed. Reload before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title="Existing product images"
      description="The first image is the cover. Removing detaches the image from the product; it does not delete the stored file."
    >
      {legacy ? (
        <p>
          Legacy images require the existing application. No replacement is
          attempted here.
        </p>
      ) : (
        <>
          <ol>
            {items.map((item, index) => (
              <li key={item.path}>
                <p>
                  {item.original_filename || `Image ${index + 1}`}
                  {index === 0 ? " · Cover" : ""}
                </p>
                <div className="commerce-row-actions">
                  <Button
                    variant="secondary"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    Move image {index + 1} earlier
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy || index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    Move image {index + 1} later
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy || items.length === 1}
                    onClick={() => {
                      setItems(items.filter((_, i) => i !== index));
                      setConfirm(false);
                    }}
                  >
                    Remove image {index + 1}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          {!items.length && (
            <p>
              No images selected. Publishing may require at least one image.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          {confirm && (
            <p role="status">
              Save this image order and detach removed images from the real
              product?
            </p>
          )}
          <div className="commerce-row-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setItems(original);
                setConfirm(false);
                setError("");
              }}
            >
              Reset image changes
            </Button>
            <Button
              disabled={busy || items.length === 0}
              onClick={() => (confirm ? void save() : setConfirm(true))}
            >
              {confirm ? "Confirm image changes" : "Review image changes"}
            </Button>
          </div>
        </>
      )}
    </SectionCard>
  );
}
