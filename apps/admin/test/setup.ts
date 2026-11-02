import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
afterEach(cleanup);

const createStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
};
const ls = createStorage();
const ss = createStorage();
Object.defineProperty(window, "localStorage", { value: ls, configurable: true });
Object.defineProperty(window, "sessionStorage", { value: ss, configurable: true });
vi.stubGlobal("localStorage", ls);
vi.stubGlobal("sessionStorage", ss);
