"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { buildModel, type SiteData, type SiteModel } from "./model";

const Ctx = createContext<SiteModel | null>(null);

export function SiteProvider({ site, children }: { site: SiteData; children: ReactNode }) {
  const model = useMemo(() => buildModel(site), [site]);
  return <Ctx.Provider value={model}>{children}</Ctx.Provider>;
}

export function useSite(): SiteModel {
  const m = useContext(Ctx);
  if (!m) throw new Error("useSite() outside <SiteProvider>");
  return m;
}
