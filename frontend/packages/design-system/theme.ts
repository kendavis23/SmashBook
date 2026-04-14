// Theme configuration — consumed by Tailwind CSS variables.
// Import the relevant token set and inject into :root via the app's globals.css.
export const lightTheme = "light" as const;
export const darkTheme = "dark" as const;
export type Theme = typeof lightTheme | typeof darkTheme;
