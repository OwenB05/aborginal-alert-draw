"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/slug";
import { btnPrimary, card, errorText, heading, input, label } from "@/lib/ui";

export function CreateDrawForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("draws")
      .insert({
        title: title.trim(),
        prize: prize.trim() || null,
        description: description.trim() || null,
        slug: generateSlug(title),
      })
      .select("id")
      .single();

    setSubmitting(false);
    if (insertError || !data) {
      setError("Could not create the draw. Please try again.");
      return;
    }
    router.push(`/admin/draws/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} p-5`}>
      <h2 className={`text-lg ${heading}`}>Create a new draw</h2>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="draw-title" className={label}>
            Draw title <span className="text-accent-text">*</span>
          </label>
          <input
            id="draw-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
            placeholder="Pow Wow 50/50 Draw"
          />
        </div>
        <div>
          <label htmlFor="draw-prize" className={label}>
            Prize
          </label>
          <input
            id="draw-prize"
            type="text"
            maxLength={500}
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            className={input}
            placeholder="Star blanket + $100 gift card"
          />
        </div>
        <div>
          <label htmlFor="draw-description" className={label}>
            Description / rules
          </label>
          <textarea
            id="draw-description"
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={input}
            placeholder="Winner drawn at 8pm. Must be present to claim."
          />
        </div>
      </div>
      {error && (
        <p role="alert" className={`mt-3 ${errorText}`}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className={`mt-4 w-full sm:w-auto ${btnPrimary}`}
      >
        {submitting ? "Creating…" : "Create draw & get QR code"}
      </button>
    </form>
  );
}
