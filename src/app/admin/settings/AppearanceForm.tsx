"use client";

import { Eye, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { useUiTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { themeMeta, type UiTheme } from "@/config/themes";
import { saveAppearance, type AppearanceState } from "./actions";

export function AppearanceForm({ defaultTheme, allowThemeSwitcher }: { defaultTheme: UiTheme; allowThemeSwitcher: boolean }) {
  const [theme, setTheme] = useState<UiTheme>(defaultTheme);
  const [allow, setAllow] = useState(allowThemeSwitcher);
  const [state, action, pending] = useActionState<AppearanceState, FormData>(saveAppearance, null);
  const { preview, setVisitorTheme } = useUiTheme();
  const toast = useToast();

  useEffect(() => {
    if (!state) return;
    toast({ tone: state.ok ? "success" : "error", title: state.ok ? "Appearance saved" : "Could not save", description: state.message });
    // Drop this admin's own browser override so they see the new site default
    if (state.ok) setVisitorTheme(null);
  }, [state, toast, setVisitorTheme]);

  return (
    <form action={action} className="space-y-8">
      <fieldset>
        <legend className="mb-1 font-semibold text-navy-900">Default UI theme</legend>
        <p className="mb-4 text-sm text-muted">Applies to every page of the public site and all portals.</p>
        <ThemePicker name="defaultTheme" value={theme} onChange={setTheme} />
      </fieldset>

      <label className="flex items-start gap-3 rounded-2xl border border-line p-4">
        <input type="checkbox" name="allowThemeSwitcher" checked={allow} onChange={(e) => setAllow(e.target.checked)} className="mt-1 size-4 accent-brand-600" />
        <span>
          <span className="block font-semibold text-navy-900">Let visitors choose their own theme</span>
          <span className="block text-sm text-muted">Shows a small &quot;Theme&quot; button in the corner. A visitor&apos;s choice is remembered in their browser only.</span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" aria-hidden /> {pending ? "Saving…" : "Save appearance"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => preview(theme)}>
          <Eye className="size-4" aria-hidden /> Preview {themeMeta[theme].name} here
        </Button>
      </div>
    </form>
  );
}
