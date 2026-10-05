"use client";

import type { ReactNode } from "react";
import { SmoothScroll } from "./SmoothScroll";
import { GlowCursor } from "@/components/primitives/GlowCursor";

/** App-wide client chrome shared by the product pages and every portfolio site. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      {children}
      <GlowCursor />
    </SmoothScroll>
  );
}
