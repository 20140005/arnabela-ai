"use client";

import Image from "next/image";
import Link from "next/link";

type ArnabelaLogoProps = {
  variant?: "full" | "compact";
  href?: string | null;
  priority?: boolean;
};

export default function ArnabelaLogo({
  variant = "full",
  href = "/",
  priority = false,
}: ArnabelaLogoProps) {
  const image = (
    <Image
      src="/brand/arnabela-logo-full.png?v=5"
      alt="Arnabela"
      width={variant === "compact" ? 176 : 220}
      height={variant === "compact" ? 44 : 56}
      className={`arnabela-logo arnabela-logo-${variant}`}
      priority={priority}
      unoptimized
    />
  );

  if (!href) {
    return image;
  }

  return (
    <Link href={href} className="arnabela-logo-link" aria-label="Arnabela home">
      {image}
    </Link>
  );
}
