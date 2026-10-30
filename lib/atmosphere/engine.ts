import { canvasPixelRatio, generateCircuit, particleBudget, type Circuit, type CircuitTrace, type Point } from "@/lib/atmosphere/layout";
import { generateBolt, LIGHTNING, nextStrikeDelay, strikeEnvelope, type Bolt } from "@/lib/atmosphere/lightning";

/**
 * The one animation loop behind the haunted background.
 *
 *  - circuit canvas: the occult circuitry, drawn once per resize; parallax is a
 *    CSS transform, so it never repaints per frame.
 *  - fx canvas: per frame — drifting dust and embers, the lantern revealing a
 *    brighter copy of the circuitry around the pointer, glints on nearby nodes,
 *    the occasional pulse running along a trace, and the storm: one
 *    silver-white lightning bolt at a time, at random intervals and angles.
 *  - pointer, parallax, scroll and the storm's sky-glow are published as CSS
 *    custom properties on the background root (--px --py --hx --hy --lamp --sy
 *    --flash --strike-x) for the moon, the lantern, the fog and the storm layer.
 *    No React state is touched, so nothing re-renders.
 *
 * It pauses while the tab is hidden (the next strike is a single timestamp,
 * rescheduled on return, so nothing accumulates), renders one still frame with
 * no lightning under prefers-reduced-motion, ignores touch for cursor effects,
 * and returns a cleanup that removes every listener and stops the loop.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bvx: number;
  bvy: number;
  r: number;
  alpha: number;
  phase: number;
  twinkle: number;
  depth: number;
  flare: number;
  ember: boolean;
}

interface Spark {
  x: number;
  y: number;
  born: number;
  life: number;
}

interface Pulse {
  trace: CircuitTrace;
  lengths: number[];
  total: number;
  born: number;
  life: number;
}

const REVEAL = 210; // lantern radius over the circuitry, CSS px
const GLINT = 190; // node glint radius, CSS px

function glowSprite(size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function drawCircuit(ctx: CanvasRenderingContext2D, layout: Circuit, w: number, h: number, dpr: number, bright: boolean) {
  const line = bright ? 0.36 : 0.085;
  const node = bright ? 0.62 : 0.17;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 1;

  ctx.strokeStyle = `rgba(255,255,255,${line})`;
  ctx.beginPath();
  for (const { points } of layout.traces) {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();

  // Measurement rails: the kingdom's old instruments.
  ctx.strokeStyle = `rgba(255,255,255,${line * 0.7})`;
  ctx.beginPath();
  for (const { from, to } of layout.rails) {
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    for (let y = from[1], i = 0; y <= to[1]; y += 18, i++) {
      const tick = i % 4 === 0 ? 7 : 3;
      ctx.moveTo(from[0] - tick, y);
      ctx.lineTo(from[0], y);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = `rgba(255,255,255,${node})`;
  ctx.fillStyle = `rgba(255,255,255,${node})`;
  for (const n of layout.nodes) {
    ctx.beginPath();
    if (n.kind === "via") {
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (n.kind === "pad") {
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (n.kind === "terminal") {
      ctx.rect(n.x - 3, n.y - 3, 6, 6);
      ctx.moveTo(n.x - 6, n.y);
      ctx.lineTo(n.x - 3, n.y);
      ctx.stroke();
    } else {
      // rune: a lozenge with a seeing point and four ticks
      const r = n.r;
      ctx.moveTo(n.x, n.y - r);
      ctx.lineTo(n.x + r, n.y);
      ctx.lineTo(n.x, n.y + r);
      ctx.lineTo(n.x - r, n.y);
      ctx.closePath();
      ctx.moveTo(n.x, n.y - r - 4);
      ctx.lineTo(n.x, n.y - r - 1.5);
      ctx.moveTo(n.x, n.y + r + 1.5);
      ctx.lineTo(n.x, n.y + r + 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(n.x, n.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Keep the reading area clear: erase an ellipse over the centre of the viewport.
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.translate(w / 2, h / 2);
  ctx.scale(w * 0.36, h * 0.46);
  const clear = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  clear.addColorStop(0, "rgba(0,0,0,1)");
  clear.addColorStop(0.72, "rgba(0,0,0,0.85)");
  clear.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = clear;
  ctx.fillRect(-1.5, -1.5, 3, 3);
  ctx.restore();
}

export function startAtmosphere({ root, circuit, fx }: { root: HTMLElement; circuit: HTMLCanvasElement; fx: HTMLCanvasElement }) {
  const cctx = circuit.getContext("2d");
  const fctx = fx.getContext("2d");
  if (!cctx || !fctx) return () => undefined;

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  let reduced = reducedQuery.matches;
  let coarse = !fineQuery.matches;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let layout: Circuit = { traces: [], nodes: [], rails: [], band: { x: 0, y: 0 } };
  let particles: Particle[] = [];
  let lit: HTMLCanvasElement | null = null;
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d")!;
  let revealMask: CanvasGradient | null = null;
  const glow = glowSprite();

  // pointer target, smoothed position, lantern strength and parallax
  let tx = 0;
  let ty = 0;
  let sx = 0;
  let sy = 0;
  let active = false;
  let lamp = 0;
  let hx = 0;
  let hy = 0;

  let raf = 0;
  let last = 0;
  let lastDraw = 0;
  const sparks: Spark[] = [];
  const pulses: Pulse[] = [];
  let nextSpark = 0;
  let nextPulse = 0;

  // The storm: at most one bolt alive; the next strike is one timestamp.
  let bolt: { shape: Bolt; born: number } | null = null;
  let nextStrike = Infinity;
  let strikes = 0;

  const written = new Map<string, string>();
  const setVar = (name: string, value: string) => {
    if (written.get(name) === value) return;
    written.set(name, value);
    root.style.setProperty(`--${name}`, value);
  };

  function spawn(): Particle {
    const ember = Math.random() < 0.12;
    const speed = 0.05 + Math.random() * 0.16;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4; // mostly rising, like ash over a fire
    const bvx = Math.cos(angle) * speed;
    const bvy = Math.sin(angle) * speed * 0.7;
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: bvx,
      vy: bvy,
      bvx,
      bvy,
      r: ember ? 1.3 + Math.random() * 1.1 : 0.4 + Math.random() * 0.9,
      alpha: ember ? 0.32 + Math.random() * 0.25 : 0.1 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.4 + Math.random() * 1.1,
      depth: 0.3 + Math.random() * 0.9,
      flare: 0,
      ember,
    };
  }

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = canvasPixelRatio(window.devicePixelRatio, coarse);
    for (const c of [circuit, fx]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    layout = generateCircuit(w, h);
    drawCircuit(cctx!, layout, w, h, dpr, false);
    if (!coarse && !reduced) {
      lit ??= document.createElement("canvas");
      lit.width = circuit.width;
      lit.height = circuit.height;
      drawCircuit(lit.getContext("2d")!, layout, w, h, dpr, true);
      scratch.width = scratch.height = Math.round(REVEAL * 2 * dpr);
      const half = scratch.width / 2;
      revealMask = sctx.createRadialGradient(half, half, 0, half, half, half);
      revealMask.addColorStop(0, "rgba(0,0,0,1)");
      revealMask.addColorStop(0.55, "rgba(0,0,0,0.45)");
      revealMask.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      lit = null;
    }
    const budget = particleBudget(w, h, { coarse, reduced });
    while (particles.length < budget) particles.push(spawn());
    if (particles.length > budget) particles = particles.slice(0, budget);
    if (!sx && !sy) {
      sx = tx = w * 0.72;
      sy = ty = h * 0.3;
    }
    if (!raf) draw(performance.now(), 0);
  }

  function polylineLengths(trace: CircuitTrace) {
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < trace.points.length; i++) {
      const [ax, ay] = trace.points[i - 1];
      const [bx, by] = trace.points[i];
      const l = Math.hypot(bx - ax, by - ay);
      lengths.push(l);
      total += l;
    }
    return { lengths, total };
  }

  function pointOn(p: Pulse, f: number): [number, number] {
    let d = f * p.total;
    for (let i = 0; i < p.lengths.length; i++) {
      if (d <= p.lengths[i]) {
        const [ax, ay] = p.trace.points[i];
        const [bx, by] = p.trace.points[i + 1];
        const k = p.lengths[i] ? d / p.lengths[i] : 0;
        return [ax + (bx - ax) * k, ay + (by - ay) * k];
      }
      d -= p.lengths[i];
    }
    const end = p.trace.points[p.trace.points.length - 1];
    return [end[0], end[1]];
  }

  /** Bolts stay dimmer where content is read: the same ellipse the circuitry keeps clear. */
  function calm(x: number, y: number) {
    const r2 = ((x - w / 2) / (w * 0.36)) ** 2 + ((y - h / 2) / (h * 0.46)) ** 2;
    return 0.38 + 0.62 * Math.min(1, r2 / 0.6);
  }

  function strokeJagged(ctx: CanvasRenderingContext2D, points: Point[], alpha: number) {
    for (let i = 1; i < points.length; i++) {
      const [ax, ay] = points[i - 1];
      const [bx, by] = points[i];
      ctx.globalAlpha = alpha * calm((ax + bx) / 2, (ay + by) / 2);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  }

  function drawLightning(t: number) {
    if (!bolt) return;
    const k = strikeEnvelope(t - bolt.born, bolt.shape.secondary);
    if (k <= 0.001) return;
    const ctx = fctx!;
    const thin = coarse || w < 768;
    const { main, branches } = bolt.shape;
    // A localized halo along the bolt — never a full-screen flash.
    if (!thin) {
      for (let i = 2; i < main.length; i += 5) {
        const [x, y] = main[i];
        ctx.globalAlpha = k * 0.13 * calm(x, y);
        ctx.drawImage(glow, x - 70, y - 70, 140, 140);
      }
    }
    ctx.strokeStyle = "#f5f5f5";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Outer glow → inner glow → near-white core.
    const passes: [number, number][] = thin ? [[2.2, 0.12], [0.9, 0.75]] : [[7, 0.06], [3.2, 0.2], [1.4, 1]];
    for (const [width, alpha] of passes) {
      ctx.lineWidth = width;
      strokeJagged(ctx, main, k * alpha);
      ctx.lineWidth = width * 0.6;
      for (const branch of branches) strokeJagged(ctx, branch, k * alpha * 0.5);
    }
    ctx.globalAlpha = 1;
  }

  function scheduleStrike(now: number, first = false) {
    nextStrike = now + nextStrikeDelay(Math.random, first);
  }

  /** Advances the storm and returns the sky-glow strength for this frame. */
  function stepStorm(t: number) {
    if (!bolt && t >= nextStrike) {
      const detail = coarse ? 0.6 : w < 1024 ? 0.8 : 1;
      bolt = { shape: generateBolt(w, h, Math.random, detail), born: t };
      strikes += 1;
      root.dataset.storm = "striking";
      root.dataset.strikes = String(strikes);
      setVar("strike-x", `${(bolt.shape.originX * 100).toFixed(1)}%`);
    }
    if (!bolt) return 0;
    const age = t - bolt.born;
    if (age >= LIGHTNING.life) {
      bolt = null;
      root.dataset.storm = "idle";
      scheduleStrike(t);
      return 0;
    }
    return strikeEnvelope(age, bolt.shape.secondary);
  }

  function draw(t: number, dt: number) {
    const ox = -hx * 10;
    const oy = -hy * 8;
    fctx!.setTransform(1, 0, 0, 1, 0, 0);
    fctx!.clearRect(0, 0, fx.width, fx.height);

    // The lantern reveals the brighter circuitry around the pointer.
    if (lit && revealMask && lamp > 0.01) {
      const size = scratch.width;
      sctx.globalCompositeOperation = "source-over";
      sctx.clearRect(0, 0, size, size);
      sctx.drawImage(lit, (sx - ox - REVEAL) * dpr, (sy - oy - REVEAL) * dpr, size, size, 0, 0, size, size);
      sctx.globalCompositeOperation = "destination-in";
      sctx.fillStyle = revealMask;
      sctx.fillRect(0, 0, size, size);
      fctx!.globalAlpha = lamp * 0.85;
      fctx!.drawImage(scratch, (sx - REVEAL) * dpr, (sy - REVEAL) * dpr);
    }

    fctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Lightning sits above the silhouettes and below the dust.
    drawLightning(t);

    // Nodes near the lantern glint.
    if (lamp > 0.01) {
      for (const n of layout.nodes) {
        const nx = n.x + ox;
        const ny = n.y + oy;
        const d = Math.hypot(nx - sx, ny - sy);
        if (d > GLINT) continue;
        const a = (1 - d / GLINT) ** 2 * lamp * 0.55;
        fctx!.globalAlpha = a;
        fctx!.drawImage(glow, nx - 9, ny - 9, 18, 18);
      }
    }

    // Sparks: a node somewhere in the machine lights for a moment.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const f = (t - s.born) / s.life;
      if (f >= 1) {
        sparks.splice(i, 1);
        continue;
      }
      fctx!.globalAlpha = Math.sin(Math.PI * f) * 0.5;
      fctx!.drawImage(glow, s.x + ox - 13, s.y + oy - 13, 26, 26);
    }

    // Pulses: a point of light travelling along a trace.
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const f = (t - p.born) / p.life;
      if (f >= 1) {
        pulses.splice(i, 1);
        continue;
      }
      const [px, py] = pointOn(p, f);
      fctx!.globalAlpha = Math.sin(Math.PI * f) * 0.55;
      fctx!.drawImage(glow, px + ox - 7, py + oy - 7, 14, 14);
    }

    // Dust, ash and embers.
    fctx!.fillStyle = "#ececec";
    const push = lamp > 0.02;
    for (const p of particles) {
      if (dt > 0) {
        if (push) {
          const dx = p.x - sx;
          const dy = p.y - sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140 && d2 > 1) {
            const d = Math.sqrt(d2);
            const force = (1 - d / 140) ** 2 * 0.35 * lamp;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
            if (Math.random() < 0.02) p.flare = Math.max(p.flare, 0.6);
          }
        }
        p.vx += (p.bvx - p.vx) * 0.03 * dt;
        p.vy += (p.bvy - p.vy) * 0.03 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -12) p.x = w + 12;
        else if (p.x > w + 12) p.x = -12;
        if (p.y < -12) p.y = h + 12;
        else if (p.y > h + 12) p.y = -12;
        if (Math.random() < 0.0006 * dt) p.flare = 1;
        p.flare *= 0.97 ** dt;
      }
      const a = Math.min(1, p.alpha * (0.6 + 0.4 * Math.sin(t * 0.001 * p.twinkle + p.phase)) + p.flare * 0.5);
      const x = p.x - hx * p.depth * 16;
      const y = p.y - hy * p.depth * 10;
      if (p.ember) {
        fctx!.globalAlpha = a * 0.45;
        fctx!.drawImage(glow, x - p.r * 6, y - p.r * 6, p.r * 12, p.r * 12);
      }
      fctx!.globalAlpha = a;
      fctx!.beginPath();
      fctx!.arc(x, y, p.r, 0, Math.PI * 2);
      fctx!.fill();
    }
    fctx!.globalAlpha = 1;
  }

  function frame(t: number) {
    raf = window.requestAnimationFrame(frame);
    // Touch devices run at half rate: the scene is slow, and batteries matter.
    if (coarse && t - lastDraw < 32) return;
    lastDraw = t;
    const dt = last ? Math.min(t - last, 50) / 16.67 : 1;
    last = t;

    const ease = 1 - 0.88 ** dt;
    sx += (tx - sx) * ease;
    sy += (ty - sy) * ease;
    lamp += ((active ? 1 : 0) - lamp) * (1 - 0.95 ** dt);
    hx += ((w ? (sx / w) * 2 - 1 : 0) * (active ? 1 : 0.3) - hx) * (1 - 0.96 ** dt);
    hy += ((h ? (sy / h) * 2 - 1 : 0) * (active ? 1 : 0.3) - hy) * (1 - 0.96 ** dt);

    if (t > nextSpark && layout.nodes.length) {
      const n = layout.nodes[Math.floor(Math.random() * layout.nodes.length)];
      sparks.push({ x: n.x, y: n.y, born: t, life: 1600 });
      nextSpark = t + 1600 + Math.random() * 1800;
    }
    if (t > nextPulse && pulses.length < 2 && layout.traces.length) {
      const trace = layout.traces[Math.floor(Math.random() * layout.traces.length)];
      pulses.push({ trace, ...polylineLengths(trace), born: t, life: 2400 });
      nextPulse = t + 3500 + Math.random() * 2500;
    }

    setVar("px", `${sx.toFixed(1)}px`);
    setVar("py", `${sy.toFixed(1)}px`);
    setVar("hx", hx.toFixed(3));
    setVar("hy", hy.toFixed(3));
    setVar("lamp", lamp.toFixed(3));
    setVar("flash", (stepStorm(t) * LIGHTNING.skyFlash).toFixed(3));
    circuit.style.transform = `translate3d(${(-hx * 10).toFixed(2)}px, ${(-hy * 8).toFixed(2)}px, 0)`;
    draw(t, dt);
  }

  function setMode() {
    root.dataset.pointer = coarse ? "coarse" : "fine";
    if (reduced) {
      stop();
      root.dataset.atmosphere = "static";
      lamp = 0;
      setVar("lamp", "0");
      draw(performance.now(), 0);
    } else if (document.hidden) {
      stop();
      root.dataset.atmosphere = "paused";
    } else if (!raf) {
      last = 0;
      root.dataset.atmosphere = "running";
      // Resume cleanly: no strike was "owed" while hidden.
      scheduleStrike(performance.now(), true);
      raf = window.requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
    bolt = null;
    nextStrike = Infinity;
    root.dataset.storm = "idle";
    setVar("flash", "0");
  }

  const onPointerMove = (e: PointerEvent) => {
    if (reduced || coarse || e.pointerType === "touch") return;
    tx = e.clientX;
    ty = e.clientY;
    active = true;
  };
  const onPointerOut = (e: PointerEvent) => {
    if (!e.relatedTarget) active = false;
  };
  const onBlur = () => {
    active = false;
  };
  let scrollQueued = false;
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(() => {
      scrollQueued = false;
      setVar("sy", Math.min(1, window.scrollY / Math.max(1, window.innerHeight)).toFixed(3));
    });
  };
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  };
  const onMotionChange = () => {
    reduced = reducedQuery.matches;
    resize();
    setMode();
  };
  const onPointerKindChange = () => {
    coarse = !fineQuery.matches;
    if (coarse) active = false;
    resize();
    setMode();
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerout", onPointerOut, { passive: true });
  window.addEventListener("blur", onBlur);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", setMode);
  reducedQuery.addEventListener("change", onMotionChange);
  fineQuery.addEventListener("change", onPointerKindChange);

  resize();
  onScroll();
  setMode();

  return () => {
    stop();
    if (resizeTimer) clearTimeout(resizeTimer);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerout", onPointerOut);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", setMode);
    reducedQuery.removeEventListener("change", onMotionChange);
    fineQuery.removeEventListener("change", onPointerKindChange);
  };
}
