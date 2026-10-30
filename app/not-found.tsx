import Link from "next/link";
import { WheelSigil } from "@/components/art/seal";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60dvh] flex-col items-center justify-center gap-8 py-20 text-center">
      <WheelSigil className="size-32 opacity-70" />
      <div>
        <p className="eyebrow">404 · Page not found · Lost in the fog</p>
        <h1 className="gothic silver mt-4 text-4xl font-semibold sm:text-6xl">This road leads nowhere.</h1>
        <p className="mx-auto mt-4 max-w-md text-secondary">
          The page you sought is not on any chart of Valmora. Check the address, or return to a road the Crown still keeps.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses("primary", "md")}>
          Return to the overview
        </Link>
        <Link href="/incidents" className={buttonClasses("secondary", "md")}>
          Search the registry
        </Link>
      </div>
    </Container>
  );
}
