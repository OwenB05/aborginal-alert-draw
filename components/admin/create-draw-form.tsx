"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/slug";

const inputClass =
  "mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

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
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Create a new draw</h2>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium">
          Draw title <span className="text-danger">*</span>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Pow Wow 50/50 Draw"
          />
        </label>
        <label className="block text-sm font-medium">
          Prize
          <input
            type="text"
            maxLength={500}
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            className={inputClass}
            placeholder="Star blanket + $100 gift card"
          />
        </label>
        <label className="block text-sm font-medium">
          Description / rules
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Winner drawn at 8pm. Must be present to claim."
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark disabled:opacity-60"
      >
        {submitting ? "Creating…" : "Create draw & get QR code"}
      </button>
    </form>
  );
}
