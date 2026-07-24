import "@testing-library/jest-dom/vitest";

/* Node's own experimental `localStorage` shadows jsdom's and is inert without
 * --localstorage-file, so the browser API the app actually targets is missing
 * under test. Install a minimal in-memory Storage so anything that persists UI
 * state (compose/overrides.ts) is exercised for real rather than silently
 * skipping through its try/catch. */
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    key: (index) => [...store.keys()][index] ?? null,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage });
}
