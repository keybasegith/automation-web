"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated =
      typeof window !== "undefined" &&
      window.localStorage.getItem("isAuthenticated") === "true";
    router.replace(isAuthenticated ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
