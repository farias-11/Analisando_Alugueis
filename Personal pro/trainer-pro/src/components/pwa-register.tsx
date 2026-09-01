"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação do PWA é um extra — falha silenciosa não deve travar o app
      });
    }
  }, []);

  return null;
}
