"use client";

import Image from "next/image";

type ArnabelaRibbonProps = {
  className?: string;
  opacity?: number;
};

/** Subtle flowing A/ribbon motif — brand signature, not a logo substitute. */
export default function ArnabelaRibbon({
  className = "",
  opacity = 0.22,
}: ArnabelaRibbonProps) {
  return (
    <div
      className={`arnabela-ribbon ${className}`.trim()}
      aria-hidden="true"
      style={{ opacity }}
    >
      <Image
        src="/brand/arnabela-ribbon.png?v=1"
        alt=""
        width={264}
        height={185}
        className="arnabela-ribbon-img"
        unoptimized
      />
    </div>
  );
}
