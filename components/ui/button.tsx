import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "quiet";
type Size = "sm" | "md" | "lg";

const base =
  "group/button relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-mono uppercase tracking-[0.16em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-(--ease-noir) disabled:pointer-events-none disabled:opacity-40 active:translate-y-px active:scale-[0.985]";

const variants: Record<Variant, string> = {
  primary:
    "btn-sheen overflow-hidden bg-ivory text-canvas border border-ivory hover:bg-bright hover:shadow-glow font-semibold",
  secondary:
    "border border-line-strong bg-canvas/40 text-ivory hover:border-ivory/80 hover:bg-white/[0.05] hover:shadow-[0_0_24px_-8px_rgb(255_255_255/0.35)]",
  ghost: "text-secondary hover:text-bright hover:bg-white/[0.05] border border-transparent",
  quiet: "text-muted hover:text-ivory border border-transparent underline-offset-4 hover:underline",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-[0.68rem] rounded-xs",
  md: "h-11 px-5 text-[0.72rem] rounded-xs",
  lg: "h-13 px-7 text-[0.76rem] rounded-xs",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}
