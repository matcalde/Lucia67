"use client";

import { useEffect, useState } from "react";

export type HeroImageProps = {
  primarySrc?: string; // es: URL da DB o CDN
  fallbackSrc?: string; // es: "/hero.svg"
  alt?: string;
  className?: string;
};

export default function HeroImage({
  primarySrc = "/hero.svg",
  fallbackSrc = "/hero.svg",
  alt = "Hero",
  className = "h-full w-full object-cover",
}: HeroImageProps) {
  const [src, setSrc] = useState(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setSrc(fallbackSrc)}
    />
  );
}