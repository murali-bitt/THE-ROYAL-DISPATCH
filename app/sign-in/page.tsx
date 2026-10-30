import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Container, PageHero } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the Royal Dispatch as a steward or member of the Royal Council.",
};

export default function SignInPage() {
  return (
    <>
      <PageHero label="Officers of the Crown" realm="The Officers' Gate" title="Sign in">
        Stewards and Council members sign in to manage incidents. Citizens never need an account to file a report.
      </PageHero>
      <Container className="mt-12 max-w-xl">
        <SignInForm />
      </Container>
    </>
  );
}
