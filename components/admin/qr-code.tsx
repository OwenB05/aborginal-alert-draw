"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders a QR code for a path on the current origin (client-only so the
 * deployed domain is always correct without configuration). */
export function QrCode({
  path,
  size = 240,
  className,
}: {
  path: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const fullUrl = `${window.location.origin}${path}`;
    setUrl(fullUrl);
    QRCode.toDataURL(fullUrl, {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#221b16", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [path, size]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code linking to ${url}`}
      width={size}
      height={size}
      className={className}
    />
  );
}
