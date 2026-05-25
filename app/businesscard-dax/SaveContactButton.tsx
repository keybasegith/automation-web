"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";

type Props = {
  vcard: string;
  fileName: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function SaveContactButton({ vcard, fileName, className, style }: Props) {
  const [saved, setSaved] = useState(false);

  const handleClick = () => {
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
      aria-label="Save contact to phone"
    >
      {saved ? (
        <>
          <Check className="h-4 w-4" />
          <span>Saved to contacts</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          <span>Save Contact</span>
        </>
      )}
    </button>
  );
}
