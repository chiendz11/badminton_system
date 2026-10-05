import type { Selection } from "@badminton/booking-contracts";
export type QuoteSelection = Selection & { courtName: string; price: number };
