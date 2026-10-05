import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
afterEach(cleanup);

vi.stubGlobal("localStorage", window.localStorage);
vi.stubGlobal("sessionStorage", window.sessionStorage);
