"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { ArrowRight, Check, Copy, ImagePlus, Loader2, Trash } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { RoyalSeal } from "@/components/art/seal";
import { CategoryIcon } from "@/components/incidents/category-icon";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { describedBy, Field, FieldError, Input, Select, Textarea } from "@/components/ui/field";
import { SeverityBars } from "@/components/ui/marks";
import { Skeleton } from "@/components/ui/skeleton";
import { ATTACHMENT_LIMITS } from "@/lib/config";
import { playSealChime } from "@/lib/audio/sound-control";
import { RepositoryError } from "@/lib/data/repository";
import { CATEGORY_HELP, CATEGORY_LABEL, SEVERITY_HELP, SEVERITY_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { newIncidentSchema, type NewIncidentInput } from "@/lib/validation";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES, type Incident } from "@/types/domain";

const FIELD_ORDER: (keyof NewIncidentInput)[] = [
  "title",
  "category",
  "villageId",
  "location",
  "description",
  "severity",
  "reporterName",
  "attachment",
];

const FIELD_NAME: Record<keyof NewIncidentInput, string> = {
  title: "Incident title",
  category: "Kind of incident",
  villageId: "Affected village",
  location: "Location or landmark",
  description: "What happened",
  severity: "Severity",
  anonymous: "Anonymous",
  reporterName: "Your name",
  attachment: "Supporting image",
};

/** Downscale an image in the browser and return a JPEG data URL. */
async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, ATTACHMENT_LIMITS.maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.filter = "grayscale(1)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.78;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > ATTACHMENT_LIMITS.maxStoredChars && quality > 0.35) {
    quality -= 0.12;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}

export function ReportForm() {
  const { snapshot, status, actions, actor } = useKingdom();
  const params = useSearchParams();
  const uid = useId();
  const [result, setResult] = useState<Incident | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | undefined>();
  const [processingImage, setProcessingImage] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const presetVillage = params.get("village") ?? "";
  const presetCategory = (INCIDENT_CATEGORIES as readonly string[]).includes(params.get("category") ?? "")
    ? (params.get("category") as NewIncidentInput["category"])
    : undefined;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<NewIncidentInput>({
    resolver: zodResolver(newIncidentSchema),
    defaultValues: {
      title: "",
      category: presetCategory,
      villageId: presetVillage,
      location: "",
      description: "",
      severity: undefined,
      anonymous: false,
      reporterName: "",
      attachment: null,
    },
    shouldFocusError: true,
  });

  // Under <Activity>, this page stays mounted when hidden. Clear a finished
  // submission so returning to "Report" always starts a fresh form.
  useLayoutEffect(() => {
    return () => setResult(null);
  }, []);

  const [anonymous, attachment, descriptionValue, category, severity] = useWatch({
    control,
    name: ["anonymous", "attachment", "description", "category", "severity"],
  });
  const description = descriptionValue ?? "";

  async function onSubmit(values: NewIncidentInput) {
    setSubmitError(null);
    try {
      const { record } = await actions.createIncident(values);
      setResult(record);
      reset({ ...values, title: "", location: "", description: "", attachment: null, category: undefined, severity: undefined });
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`Report sealed as ${record.reference}`);
      // Confirmation chime, only while the global sound switch is on. Failure is silent: it is decoration.
      playSealChime();
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      if (error instanceof RepositoryError) {
        for (const [field, message] of Object.entries(error.fields)) {
          if ((FIELD_ORDER as string[]).includes(field)) setError(field as keyof NewIncidentInput, { message });
        }
        setSubmitError(error.message);
      } else {
        setSubmitError("The report could not be filed. Please try again.");
      }
      toast.error("Your report was not filed");
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  function onInvalid() {
    setSubmitError(null);
  }

  async function onFile(file: File | undefined) {
    setAttachmentError(undefined);
    if (!file) return;
    if (!(ATTACHMENT_LIMITS.acceptedTypes as readonly string[]).includes(file.type)) {
      setAttachmentError("Only JPEG, PNG or WebP images are accepted.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > ATTACHMENT_LIMITS.maxInputBytes) {
      setAttachmentError("Images must be 5 MB or smaller.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setProcessingImage(true);
    try {
      const url = await compressImage(file);
      setValue("attachment", url, { shouldValidate: true });
    } catch {
      setAttachmentError("That image could not be read. Try a different file.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setProcessingImage(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-6" role="status" aria-label="Loading the report form">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (result) {
    const village = snapshot.villages.find((v) => v.id === result.villageId);
    return <ReportReceipt incident={result} villageName={village?.name} headingRef={successRef} onAnother={() => setResult(null)} />;
  }

  const errorList = FIELD_ORDER.filter((k) => errors[k]?.message).map((k) => ({
    key: k,
    message: errors[k]!.message as string,
  }));

  const id = (name: string) => `${uid}-${name}`;

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit, onInvalid)(event)} noValidate className="flex flex-col gap-10" aria-describedby={id("intro")}>
      <p id={id("intro")} className="sr-only">
        All fields are required unless marked optional.
      </p>

      {(submitCount > 0 && errorList.length > 0) || submitError ? (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="border border-ivory px-5 py-4 focus:outline-none">
          <p className="eyebrow !text-bright">
            {submitError ? "The report was not filed" : `${errorList.length} field${errorList.length === 1 ? "" : "s"} need attention`}
          </p>
          {submitError ? <p className="mt-2 text-sm text-secondary">{submitError}</p> : null}
          {errorList.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {errorList.map((e) => (
                <li key={e.key}>
                  <a href={`#${id(e.key)}`} className="text-ivory underline underline-offset-4 hover:text-bright">
                    {FIELD_NAME[e.key]}
                  </a>
                  <span className="text-muted"> — {e.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* 01 — What */}
      <fieldset className="flex flex-col gap-6">
        <legend className="eyebrow mb-6 flex items-center gap-3">
          <span className="text-ivory">01</span>
          <span aria-hidden className="h-px w-8 bg-line-strong" />
          What is happening
        </legend>

        <Field id={id("title")} label="Incident title" hint="One line a steward can understand at a glance." error={errors.title?.message}>
          <Input
            id={id("title")}
            placeholder="e.g. Well water has turned black on Mill Street"
            autoComplete="off"
            aria-invalid={!!errors.title}
            aria-describedby={describedBy(id("title"), errors.title?.message, true)}
            {...register("title")}
          />
        </Field>

        <div className="flex flex-col gap-3">
          <p id={id("category-label")} className="text-sm font-medium text-ivory">
            Kind of incident
          </p>
          <div
            role="radiogroup"
            aria-labelledby={id("category-label")}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? id("category-error") : undefined}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {INCIDENT_CATEGORIES.map((c, index) => (
              <label
                key={c}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-xs border px-4 py-3 transition-colors",
                  category === c ? "border-ivory bg-white/[0.05]" : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  value={c}
                  id={index === 0 ? id("category") : undefined}
                  className="peer sr-only"
                  {...register("category")}
                />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bright" />
                <CategoryIcon category={c} className={cn("mt-0.5 size-4 shrink-0", category === c ? "text-bright" : "text-muted")} />
                <span>
                  <span className="block text-sm font-medium text-ivory">{CATEGORY_LABEL[c]}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{CATEGORY_HELP[c]}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id={id("category-error")} message={errors.category?.message} />
        </div>
      </fieldset>

      {/* 02 — Where */}
      <fieldset className="flex flex-col gap-6">
        <legend className="eyebrow mb-6 flex items-center gap-3">
          <span className="text-ivory">02</span>
          <span aria-hidden className="h-px w-8 bg-line-strong" />
          Where it is happening
        </legend>
        <div className="grid gap-6 md:grid-cols-2">
          <Field id={id("villageId")} label="Affected village" error={errors.villageId?.message}>
            <Select
              id={id("villageId")}
              aria-invalid={!!errors.villageId}
              aria-describedby={describedBy(id("villageId"), errors.villageId?.message)}
              {...register("villageId")}
            >
              <option value="">Choose a village…</option>
              {snapshot.villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.epithet}
                </option>
              ))}
            </Select>
          </Field>
          <Field id={id("location")} label="Location or landmark" hint="A road, building or landmark responders can find." error={errors.location?.message}>
            <Input
              id={id("location")}
              placeholder="e.g. North well-house, Lantern Square"
              aria-invalid={!!errors.location}
              aria-describedby={describedBy(id("location"), errors.location?.message, true)}
              {...register("location")}
            />
          </Field>
        </div>

        <Field
          id={id("description")}
          label="What happened"
          hint={
            <span className="flex justify-between gap-4">
              <span>What you saw, when it started, and whether anyone is hurt.</span>
              <span className="font-mono tabular">{description.length}/2000</span>
            </span>
          }
          error={errors.description?.message}
        >
          <Textarea
            id={id("description")}
            rows={6}
            placeholder="Describe the disturbance in your own words…"
            aria-invalid={!!errors.description}
            aria-describedby={describedBy(id("description"), errors.description?.message, true)}
            {...register("description")}
          />
        </Field>
      </fieldset>

      {/* 03 — How severe */}
      <fieldset className="flex flex-col gap-4">
        <legend className="eyebrow mb-6 flex items-center gap-3">
          <span className="text-ivory">03</span>
          <span aria-hidden className="h-px w-8 bg-line-strong" />
          How severe is it
        </legend>
        <div
          role="radiogroup"
          aria-label="Severity"
          aria-invalid={!!errors.severity}
          aria-describedby={errors.severity ? id("severity-error") : undefined}
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {INCIDENT_SEVERITIES.map((s, index) => (
            <label
              key={s}
              className={cn(
                "relative flex cursor-pointer flex-col gap-3 rounded-xs border px-4 py-4 transition-colors",
                severity === s
                  ? s === "critical"
                    ? "border-ivory bg-ivory text-canvas"
                    : "border-ivory bg-white/[0.05]"
                  : "border-line hover:border-line-strong",
              )}
            >
              <input type="radio" value={s} id={index === 0 ? id("severity") : undefined} className="peer sr-only" {...register("severity")} />
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bright" />
              <span className="flex items-center justify-between">
                <span className={cn("font-mono text-[0.7rem] font-semibold uppercase tracking-[0.18em]", severity === s && s === "critical" ? "text-canvas" : "text-ivory")}>
                  {SEVERITY_LABEL[s]}
                </span>
                <SeverityBars severity={s} />
              </span>
              <span className={cn("text-xs leading-snug", severity === s && s === "critical" ? "text-canvas/75" : "text-muted")}>
                {SEVERITY_HELP[s]}
              </span>
            </label>
          ))}
        </div>
        <FieldError id={id("severity-error")} message={errors.severity?.message} />
      </fieldset>

      {/* 04 — Who & evidence */}
      <fieldset className="flex flex-col gap-6">
        <legend className="eyebrow mb-6 flex items-center gap-3">
          <span className="text-ivory">04</span>
          <span aria-hidden className="h-px w-8 bg-line-strong" />
          Who is reporting
        </legend>
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-4">
            <Field id={id("reporterName")} label="Your name" optional hint="Shown on the public record so stewards can thank you." error={errors.reporterName?.message}>
              <Input
                id={id("reporterName")}
                placeholder="e.g. Maud Teller"
                autoComplete="name"
                disabled={anonymous}
                aria-invalid={!!errors.reporterName}
                aria-describedby={describedBy(id("reporterName"), errors.reporterName?.message, true)}
                {...register("reporterName")}
              />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-white" {...register("anonymous")} />
              <span>
                <span className="font-medium text-ivory">Submit anonymously</span>
                <span className="mt-0.5 block text-xs text-muted">Your name will not be stored with this report.</span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={id("attachment")} className="flex items-baseline justify-between text-sm font-medium text-ivory">
              Supporting image
              <span className="eyebrow !text-[0.62rem] !tracking-[0.14em]">Optional</span>
            </label>
            {attachment ? (
              <div className="relative overflow-hidden rounded-xs border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img src={attachment} alt="Preview of the attached evidence" className="evidence-plate aspect-[4/3] w-full object-cover" />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-2 bg-canvas/80 backdrop-blur"
                  onClick={() => {
                    setValue("attachment", null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <Trash className="size-3.5" aria-hidden /> Remove
                </Button>
              </div>
            ) : (
              <label
                htmlFor={id("attachment")}
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xs border border-dashed border-line-strong px-4 py-6 text-center transition-colors hover:border-ivory focus-within:border-ivory"
              >
                {processingImage ? <Loader2 className="size-5 animate-spin text-ivory" aria-hidden /> : <ImagePlus className="size-5 text-muted" aria-hidden />}
                <span className="text-sm text-secondary">{processingImage ? "Preparing image…" : "Attach a photograph or sketch"}</span>
                <span className="text-xs text-muted">JPEG, PNG or WebP · up to 5 MB · stored in monochrome</span>
              </label>
            )}
            <input
              ref={fileRef}
              id={id("attachment")}
              type="file"
              accept={ATTACHMENT_LIMITS.acceptedTypes.join(",")}
              className="sr-only"
              aria-describedby={attachmentError || errors.attachment ? id("attachment-error") : undefined}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <FieldError id={id("attachment-error")} message={attachmentError ?? errors.attachment?.message} />
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-line-soft pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-xs leading-relaxed text-muted">
          Filing as <span className="text-secondary">{actor.role === "citizen" ? "a citizen" : actor.name}</span>. Reports are
          public in the registry. In danger right now? Choose <span className="text-ivory">Critical</span> — critical reports
          are reviewed first.
        </p>
        <Button type="submit" size="lg" disabled={isSubmitting || processingImage} aria-live="polite">
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Sealing report…
            </>
          ) : (
            <>
              Submit report <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function ReportReceipt({
  incident,
  villageName,
  headingRef,
  onAnother,
}: {
  incident: Incident;
  villageName?: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="receipt-heading"
      className="surface relative overflow-hidden px-6 py-10 sm:px-10"
    >
      <RoyalSeal className="absolute -right-10 -top-10 size-48 opacity-[0.07]" />
      <p className="eyebrow">Raven received · report sealed by the Dispatch</p>
      <h2 id="receipt-heading" ref={headingRef} tabIndex={-1} className="display mt-5 text-4xl focus:outline-none sm:text-5xl">
        Your message has crossed the veil.
      </h2>
      <p className="mt-4 max-w-lg text-secondary">
        The Crown has your report. Keep this tracking reference: stewards in {villageName ?? "the village"} will review it, and
        every update will appear on its record.
      </p>

      <div className="mt-8 flex flex-col gap-3 border-y border-line-soft py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Tracking reference</p>
          <p className="mt-2 font-mono text-3xl tracking-[0.06em] text-bright sm:text-4xl" data-testid="tracking-reference">
            {incident.reference}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(incident.reference);
              setCopied(true);
              toast("Reference copied");
            } catch {
              toast.error("Copy failed — select the reference and copy it manually");
            }
          }}
        >
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy reference"}
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/incidents/${incident.reference}`} className={buttonClasses("primary", "md")}>
          Track this report <ArrowRight className="size-4" aria-hidden />
        </Link>
        <Button variant="secondary" onClick={onAnother}>
          File another report
        </Button>
        <Link href="/incidents" className={buttonClasses("ghost", "md")}>
          View the registry
        </Link>
      </div>
    </motion.section>
  );
}
