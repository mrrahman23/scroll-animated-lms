"use server";

import { revalidatePath } from "next/cache";
import { isUiTheme } from "@/config/themes";
import { saveSiteSettings } from "@/lib/site-settings";
import { actor } from "@/lib/auth/session";
import { hasDatabase } from "@/lib/db/client";

export type AppearanceState = { ok: boolean; message: string } | null;

/**
 * Saves the site-wide appearance and regenerates every page.
 */
export async function saveAppearance(_prev: AppearanceState, form: FormData): Promise<AppearanceState> {
  if (hasDatabase()) {
    try {
      await actor("admin");
    } catch {
      return { ok: false, message: "Only administrators can change site settings." };
    }
  } else if (process.env.NODE_ENV === "production") {
    // Without accounts there's no way to know who is asking, so a live site refuses.
    return { ok: false, message: "Connect the database (and sign in as an admin) to change settings on a live site." };
  }
  const theme = form.get("defaultTheme");
  if (!isUiTheme(theme)) return { ok: false, message: "Unknown theme." };
  await saveSiteSettings({ defaultTheme: theme, allowThemeSwitcher: form.get("allowThemeSwitcher") === "on" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Appearance saved. All visitors now see the new default." };
}
