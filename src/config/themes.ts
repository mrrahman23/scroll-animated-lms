/**
 * UI themes. Shared by server and client code.
 * Each theme re-skins every page through design tokens (see globals.css);
 * All themes except "classic" add Three.js scenes and motion effects.
 */
export const UI_THEMES = ["classic", "aurora", "spark", "ember", "lunar", "quest", "lab"] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export function isUiTheme(v: unknown): v is UiTheme {
  return typeof v === "string" && (UI_THEMES as readonly string[]).includes(v);
}

export interface ThemeMeta {
  name: string;
  tagline: string;
  description: string;
  dark: boolean;
  /** Small preview used by the theme pickers. */
  preview: { background: string; swatches: string[] };
}

export const themeMeta: Record<UiTheme, ThemeMeta> = {
  classic: {
    name: "Classic",
    tagline: "Institutional & trustworthy",
    description: "Navy, serif headings and certificate-inspired details. Calm and credible, without heavy motion.",
    dark: false,
    preview: { background: "linear-gradient(135deg,#f6f8fc 0 55%,#0c1b40 55% 100%)", swatches: ["#0c1b40", "#2449d8", "#0b8567", "#b98a2f"] },
  },
  aurora: {
    name: "Aurora",
    tagline: "Dark, neon & cinematic",
    description: "A deep-space interface with a 3D particle galaxy, glowing glass cards and a holographic certificate medal.",
    dark: true,
    preview: { background: "radial-gradient(circle at 30% 30%,#6d5dfc 0,transparent 45%),radial-gradient(circle at 75% 70%,#22d3ee 0,transparent 40%),#070a1c", swatches: ["#070a1c", "#7c6cff", "#22d3ee", "#f472b6"] },
  },
  spark: {
    name: "Spark",
    tagline: "Playful, bold & fun",
    description: "Bright colours, chunky sticker-style cards, floating 3D shapes with a graduation cap, and confetti when certificates verify.",
    dark: false,
    preview: { background: "radial-gradient(circle at 25% 30%,#ffd6f0 0,transparent 45%),radial-gradient(circle at 80% 70%,#fff0b3 0,transparent 45%),#fbf7ff", swatches: ["#1f1147", "#7a35f0", "#ff5fa2", "#ffb938"] },
  },
  ember: {
    name: "Ember",
    tagline: "Cinematic night journey",
    description: "A full-page 3D blue-night world — moonlit hills, a lantern-lit path to the institute hall, wind-swept grass and drifting embers — that you travel through as you scroll.",
    dark: true,
    preview: {
      background: "radial-gradient(circle at 70% 30%,#e0412f 0 9%,rgb(224 65 47/.25) 10%,transparent 26%),linear-gradient(180deg,#0b1626 0 55%,#0f1d24 55% 100%)",
      swatches: ["#0b1322", "#5d7aa8", "#e0412f", "#ece8e1"],
    },
  },
  lunar: {
    name: "Lunar",
    tagline: "Cold moonlit night",
    description: "The cinematic night world in silver and ice — a pale moon, frosted trees, drifting snow-like flecks and silver-blue accents.",
    dark: true,
    preview: {
      background: "radial-gradient(circle at 70% 30%,#e6ecf7 0 9%,rgb(160 190 255/.22) 10%,transparent 26%),linear-gradient(180deg,#0a1424 0 55%,#0f1d2a 55% 100%)",
      swatches: ["#0a1424", "#7a96c8", "#9fc4ff", "#e6ecf7"],
    },
  },
  quest: {
    name: "Quest",
    tagline: "A student's tech-skills journey",
    description: "Scroll to guide a student through a neon tech world — through a portal, past floating code where skills are collected, through an assessment gate, to a holographic certificate.",
    dark: true,
    preview: {
      background: "radial-gradient(circle at 50% 40%,rgb(56 225 255/.45) 0 6%,transparent 22%),repeating-linear-gradient(90deg,rgb(56 225 255/.25) 0 1px,transparent 1px 18px),linear-gradient(180deg,#0a0f2a 0 55%,#050816 55% 100%)",
      swatches: ["#050816", "#38e1ff", "#8b5cf6", "#a3ff4f"],
    },
  },
  lab: {
    name: "Lab",
    tagline: "A day in the tech lab",
    description: "A bright, modern tech lab: scroll to walk a student through the doors, past lesson workstations and a robot arm, into an assessment, and up to the certificate wall.",
    dark: false,
    preview: {
      background: "linear-gradient(90deg,transparent 46%,#14d3c8 46% 54%,transparent 54%) 0 100%/100% 45% no-repeat,linear-gradient(180deg,#f5f7fa 0 18%,#e8eef5 18% 60%,#dbe3ec 60% 100%)",
      swatches: ["#e8eef5", "#0ea5a4", "#ff7a1a", "#1f2a37"],
    },
  },
};

export const THEME_STORAGE_KEY = "nyti-ui";
