"use client";

import { useEffect } from "react";

let redirecting = false;

function loginUrlForCurrentPage() {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const params = new URLSearchParams({ next: current, reason: "expired" });
  return `/login?${params.toString()}`;
}

export function SessionExpiryGuard() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const requestUrl = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
      const parsedUrl = new URL(requestUrl, window.location.origin);
      const isAdminApiRequest = parsedUrl.origin === window.location.origin && parsedUrl.pathname.startsWith("/api/");
      const isLoginRequest = parsedUrl.pathname === "/api/auth/login";
      const isLogoutRequest = parsedUrl.pathname === "/api/auth/logout";

      if (response.status === 401 && isAdminApiRequest && !isLoginRequest && !isLogoutRequest && window.location.pathname !== "/login" && !redirecting) {
        redirecting = true;
        window.location.assign(loginUrlForCurrentPage());
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      redirecting = false;
    };
  }, []);

  return null;
}
