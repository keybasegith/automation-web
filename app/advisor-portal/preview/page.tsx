"use client";
import { useState, useEffect } from "react";
import AdvisorPageTemplate from "@/components/advisor-portal/AdvisorPageTemplate";
import {
  toTemplate,
  EMPTY_PAGE,
  COMPANY_DESCRIPTION,
} from "@/lib/advisor-portal/workflow";
export default function AdvisorPreview() {
  const [content, setContent] = useState({
    page: EMPTY_PAGE,
    organization: COMPANY_DESCRIPTION,
  });
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "keybase-advisor-preview"
      )
        return;
      setContent({
        page: event.data.page,
        organization: event.data.organization,
      });
    };
    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: "keybase-advisor-preview-ready" },
      location.origin,
    );
    return () => window.removeEventListener("message", receive);
  }, []);
  return (
    <AdvisorPageTemplate
      profile={toTemplate(content.page, content.organization)}
    />
  );
}
