"use client";

import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

export default function Providers({ children }) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}
