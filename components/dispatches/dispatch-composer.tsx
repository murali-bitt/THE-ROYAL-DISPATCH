"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { RepositoryError } from "@/lib/data/repository";
import { ANNOUNCEMENT_CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { z } from "zod";
import { announcementSchema } from "@/lib/validation";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES, type Announcement } from "@/types/domain";

// The form picks a "scope" (kingdom or a village id); it maps onto villageId on submit.
const composerSchema = announcementSchema
  .omit({ villageId: true })
  .extend({ scope: z.string().min(1, "Choose who this dispatch is for.") });
type FormValues = z.infer<typeof composerSchema>;

/**
 * Publish a Royal Dispatch. Stewards may only issue village-scoped dispatches;
 * kingdom-wide dispatches require the Royal Council. The same rule is
 * enforced by the repository and, in production, by RLS.
 */
export function DispatchComposer({ onPublished }: { onPublished?: (a: Announcement) => void }) {
  const { snapshot, actor, actions } = useKingdom();
  const uid = useId();
  const canKingdom = can(actor.role, "announcement.publish.kingdom");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      title: "",
      summary: "",
      body: "",
      priority: "advisory",
      category: "council",
      scope: canKingdom ? "kingdom" : (snapshot.villages[0]?.id ?? ""),
      issuedBy: actor.role === "admin" ? "The Royal Council" : actor.name,
    },
  });

  if (!can(actor.role, "announcement.publish.village")) return null;

  async function onSubmit(values: FormValues) {
    const { scope, ...rest } = values;
    try {
      const { record } = await actions.publishAnnouncement({ ...rest, villageId: scope === "kingdom" ? null : scope });
      toast.success("Dispatch published");
      reset({ ...values, title: "", summary: "", body: "" });
      onPublished?.(record);
    } catch (error) {
      const message = error instanceof RepositoryError ? error.message : "The dispatch could not be published.";
      if (error instanceof RepositoryError) {
        for (const [field, msg] of Object.entries(error.fields)) {
          if (field in values) setError(field as keyof FormValues, { message: msg });
        }
      }
      setError("root", { message });
      toast.error(message);
    }
  }

  const id = (n: string) => `${uid}-${n}`;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5" aria-label="Publish a royal dispatch">
      <Field id={id("title")} label="Headline" error={errors.title?.message}>
        <Input id={id("title")} aria-invalid={!!errors.title} aria-describedby={describedBy(id("title"), errors.title?.message)} {...register("title")} />
      </Field>
      <Field id={id("summary")} label="One-line summary" error={errors.summary?.message}>
        <Input id={id("summary")} aria-invalid={!!errors.summary} aria-describedby={describedBy(id("summary"), errors.summary?.message)} {...register("summary")} />
      </Field>
      <Field id={id("body")} label="Full dispatch" hint="Separate paragraphs with a blank line." error={errors.body?.message}>
        <Textarea id={id("body")} rows={6} aria-invalid={!!errors.body} aria-describedby={describedBy(id("body"), errors.body?.message, true)} {...register("body")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("priority")} label="Priority" error={errors.priority?.message}>
          <Select id={id("priority")} {...register("priority")}>
            {ANNOUNCEMENT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={id("category")} label="Category" error={errors.category?.message}>
          <Select id={id("category")} {...register("category")}>
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ANNOUNCEMENT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id={id("scope")}
          label="Scope"
          hint={canKingdom ? undefined : "Stewards issue village dispatches. Kingdom-wide dispatches need the Royal Council."}
          error={errors.scope?.message}
        >
          <Select id={id("scope")} aria-describedby={canKingdom ? undefined : `${id("scope")}-hint`} {...register("scope")}>
            {canKingdom ? <option value="kingdom">Kingdom-wide</option> : null}
            {snapshot.villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={id("issuedBy")} label="Issuing office" error={errors.issuedBy?.message}>
          <Input id={id("issuedBy")} {...register("issuedBy")} />
        </Field>
      </div>
      {errors.root?.message ? (
        <p role="alert" className="text-sm text-bright">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="self-start" data-testid="publish-dispatch">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Publish dispatch
      </Button>
    </form>
  );
}
