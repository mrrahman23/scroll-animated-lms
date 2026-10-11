import { promises as fs } from "node:fs";
import path from "node:path";
import { isUiTheme, type UiTheme } from "@/config/themes";

/**
 * Site-wide settings managed from Admin → Settings.
 * Stored as JSON on disk so they persist on a Node host (e.g. cPanel Node.js app).
 * Swap for a database/API call when a backend exists.
 */
export interface SiteSettings {
  defaultTheme: UiTheme;
  allowThemeSwitcher: boolean;
}

const FILE = path.join(process.cwd(), "data", "site-settings.json");

function defaults(): SiteSettings {
  const env = process.env.NYTI_UI_THEME;
  return { defaultTheme: isUiTheme(env) ? env : "classic", allowThemeSwitcher: true };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const base = defaults();
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8"));
    return {
      defaultTheme: isUiTheme(raw.defaultTheme) ? raw.defaultTheme : base.defaultTheme,
      allowThemeSwitcher: typeof raw.allowThemeSwitcher === "boolean" ? raw.allowThemeSwitcher : base.allowThemeSwitcher,
    };
  } catch {
    return base;
  }
}

export async function saveSiteSettings(next: SiteSettings) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
}
