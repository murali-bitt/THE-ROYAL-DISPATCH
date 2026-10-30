"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Container className="flex min-h-[60dvh] flex-col items-start justify-center gap-6 py-20">
      <p className="eyebrow">Error · The Dispatch faltered</p>
      <h1 className="gothic silver text-4xl font-semibold sm:text-5xl">Something went wrong.</h1>
      <p className="max-w-lg text-secondary">
        This page could not be displayed. Your reports are safe in the ledger — try again, or return to the overview.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClasses("secondary", "md")}>
          Overview
        </Link>
      </div>
    </Container>
  );
}
