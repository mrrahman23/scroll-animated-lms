/**
 * Categorical chart slots (dataviz reference palette), resolved per theme in themes.css:
 * light #2a78d6 / #eb6834, dark (Aurora) #3987e5 / #d95926.
 * Use in `style` props, not SVG attributes (attributes don't resolve CSS variables).
 */
export const SERIES = ["var(--series-1)", "var(--series-2)"] as const;
