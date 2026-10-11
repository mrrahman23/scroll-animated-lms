import { THEME_STORAGE_KEY, UI_THEMES, type UiTheme } from "@/config/themes";

/**
 * Runs before first paint so the correct theme is applied with no flash.
 * Visitor choice (localStorage) wins only when the admin allows switching.
 */
export function ThemeScript({ siteDefault, allowSwitch }: { siteDefault: UiTheme; allowSwitch: boolean }) {
  const code = `(function(){try{var d=${JSON.stringify(siteDefault)},t=${JSON.stringify(UI_THEMES)};${
    allowSwitch ? `var v=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(v&&t.indexOf(v)>-1)d=v;` : ""
  }document.documentElement.setAttribute("data-ui",d);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
