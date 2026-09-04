"use client";

import { ExternalViewerProvider } from "./ExternalViewer";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ExternalViewerProvider>{children}</ExternalViewerProvider>;
}
