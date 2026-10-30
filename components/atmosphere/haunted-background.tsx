"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { HauntedMoon } from "@/components/atmosphere/haunted-moon";
import { Silhouettes } from "@/components/atmosphere/silhouettes";
import { startAtmosphere } from "@/lib/atmosphere/engine";

/**
 * THE HAUNTED CROWN — the living background behind every page.
 * One fixed, non-interactive layer (pointer-events: none, aria-hidden), drawn
 * by a single animation loop (lib/atmosphere/engine.ts) plus CSS layers:
 * atmosphere → moon → circuitry → fog → storm glow → silhouettes → lightning & dust
 * (one canvas) → lantern → vignette.
 */
export function HauntedBackground() {
  const root = useRef<HTMLDivElement>(null);
  const circuit = useRef<HTMLCanvasElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!root.current || !circuit.current || !fx.current) return;
    return startAtmosphere({ root: root.current, circuit: circuit.current, fx: fx.current });
  }, []);

  return (
    <div ref={root} aria-hidden className="haunted" data-atmosphere="static" data-testid="haunted-background">
      <div className="haunt-atmos" />
      {/* The moon depends on the route, which is request data under Cache Components. */}
      <Suspense fallback={null}>
        <RouteMoon />
      </Suspense>
      <canvas ref={circuit} className="haunt-circuit" />
      <div className="haunt-fog haunt-fog-back" />
      {/* Storm light behind the silhouettes, so the castle is backlit when lightning strikes. */}
      <div className="haunt-storm" />
      <Silhouettes />
      <canvas ref={fx} className="haunt-fx" />
      <div className="haunt-fog haunt-fog-front" />
      <div className="haunt-lantern" />
      <div className="haunt-vignette" />
    </div>
  );
}

function RouteMoon() {
  const pathname = usePathname();
  return <HauntedMoon variant={pathname === "/" ? "hero" : "watch"} />;
}
