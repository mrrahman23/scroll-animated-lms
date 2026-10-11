"use client";

import { cn } from "@/lib/format";
import { auroraScene } from "./scenes/aurora";
import { emberScene, lunarScene } from "./scenes/ember";
import { labScene } from "./scenes/lab";
import { questScene } from "./scenes/quest";
import { medalScene } from "./scenes/medal";
import { sparkScene } from "./scenes/spark";
import { useThreeScene, type SceneSetup } from "./useThreeScene";

const scenes: Record<StageScene, SceneSetup> = {
  aurora: auroraScene,
  spark: sparkScene,
  "medal-aurora": medalScene("aurora"),
  "medal-spark": medalScene("spark"),
  "medal-ember": medalScene("ember"),
  "medal-lunar": medalScene("lunar"),
  "ember-world": emberScene,
  "lunar-world": lunarScene,
  "medal-quest": medalScene("quest"),
  "quest-world": questScene,
  "medal-lab": medalScene("lab"),
  "lab-world": labScene,
};

export type StageScene = "aurora" | "spark" | "medal-aurora" | "medal-spark" | "medal-ember" | "medal-lunar" | "ember-world" | "lunar-world" | "medal-quest" | "quest-world" | "medal-lab" | "lab-world";

/**
 * Decorative 3D canvas. Fades in once ready; keeps the CSS fallback if WebGL is unavailable.
 * `className` must position the stage (e.g. "absolute inset-0" or "relative h-52").
 */
export function ThreeStage({ scene, className, fallbackClassName }: { scene: StageScene; className?: string; fallbackClassName?: string }) {
  const { containerRef, status } = useThreeScene(scenes[scene]);
  return (
    <div className={className} aria-hidden>
      {status !== "ready" && <div className={cn("absolute inset-0", fallbackClassName)} />}
      <div ref={containerRef} className={cn("absolute inset-0 transition-opacity duration-1000", status === "ready" ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
