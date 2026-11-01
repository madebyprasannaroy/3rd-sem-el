'use client';

import { ConstellationField } from "@designcodeio/threeui/components/ConstellationField";
import "@designcodeio/threeui/style.css";

/**
 * 3D Constellation & Particle Drift Shader Scene
 * High-impact dark mode with luminous emerald/cyan glowing nodes and constellation lines.
 */
export function ConstellationScene() {
  return (
    <div className="shader-frame fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-slate-950">
      {/* Deep midnight & emerald ambient gradient backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -10%, rgba(16, 185, 129, 0.16), rgba(3, 7, 18, 0.96) 80%)",
        }}
      />

      {/* 3D Glowing Constellation Particle Field */}
      <div className="absolute inset-0 opacity-90">
        <ConstellationField
          brightness={1.35}
          density={1.35}
          hue={168}
          length={1.15}
          mode="dark"
          opacity={1.00}
          saturation={1.30}
          size={1.35}
          speed={0.85}
          variant="particle-drift"
        />
      </div>

      {/* Soft vignette gradients to maintain readability along navigation edges */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
}

export default ConstellationScene;
