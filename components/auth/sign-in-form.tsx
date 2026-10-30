"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { isSupabaseConfigured } from "@/lib/env";
import { ROLE_LABEL } from "@/lib/labels";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignInForm() {
  const { actor, signedIn, reload, refreshSession } = useKingdom();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="surface flex flex-col gap-4 p-8">
        <p className="eyebrow">Local demo mode</p>
        <p className="text-secondary">
          No Supabase backend is configured, so there are no accounts. Use the <strong className="text-ivory">Demo</strong>{" "}
          role switcher in the bottom-left corner to act as a Citizen, Village Steward or Royal Council member.
        </p>
        <p className="text-sm text-muted">
          To enable real accounts, set the variables in <code className="font-mono text-secondary">.env.example</code> and apply
          the migration in <code className="font-mono text-secondary">supabase/migrations</code>.
        </p>
        <Link href="/operations" className={buttonClasses("secondary", "md", "self-start")}>
          Go to the operations desk
        </Link>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="surface flex flex-col gap-4 p-8">
        <p className="eyebrow">Signed in</p>
        <p className="text-secondary">
          You are signed in as <span className="text-ivory">{actor.name}</span> ({ROLE_LABEL[actor.role]}).
        </p>
        <Button
          variant="secondary"
          className="self-start"
          onClick={async () => {
            await createSupabaseBrowserClient().auth.signOut();
            await refreshSession();
            router.push("/");
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: error.message });
      return;
    }
    if (mode === "up") {
      setMessage({ kind: "info", text: "Account created. Check your email if confirmation is required, then sign in." });
      return;
    }
    await Promise.all([reload(), refreshSession()]);
    router.push("/operations");
  }

  return (
    <form onSubmit={submit} className="surface flex flex-col gap-5 p-8" aria-label={mode === "in" ? "Sign in" : "Create an account"}>
      <Field id="email" label="Email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field id="password" label="Password">
        <Input id="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {message ? (
        <p role={message.kind === "error" ? "alert" : "status"} className="text-sm text-bright">
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
        <Button variant="quiet" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Create a citizen account" : "I already have an account"}
        </Button>
      </div>
      <p className="text-xs text-muted">New accounts are citizens. A Royal Council member promotes stewards in the database.</p>
    </form>
  );
}
