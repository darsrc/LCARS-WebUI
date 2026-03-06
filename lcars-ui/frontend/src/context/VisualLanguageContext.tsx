import { createContext, useContext, type ReactNode } from "react";

import type { VisualLanguage } from "../types/contract";

const VisualLanguageContext = createContext<VisualLanguage>("strict");

export const VisualLanguageProvider = ({
  value,
  children,
}: {
  value: VisualLanguage;
  children: ReactNode;
}) => {
  return <VisualLanguageContext.Provider value={value}>{children}</VisualLanguageContext.Provider>;
};

export const useVisualLanguage = (): VisualLanguage => useContext(VisualLanguageContext);

export const useIsStrictMode = (): boolean => useVisualLanguage() === "strict";
