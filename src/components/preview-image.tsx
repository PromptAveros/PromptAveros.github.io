"use client";

import Image from "next/image";
import { useState } from "react";
import { siteBasePath } from "@/lib/site";

const fallbackSource = `${siteBasePath}/prompt-placeholder.svg`;

export function PreviewImage({ src, alt, width, height, className, priority = false }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const originalSource = src
    ? src.startsWith("/") && !src.startsWith(`${siteBasePath}/`) ? `${siteBasePath}${src}` : src
    : fallbackSource;
  const [source, setSource] = useState(originalSource);
  return <Image
    src={source}
    alt={alt}
    width={width}
    height={height}
    className={className}
    loading={priority ? undefined : "lazy"}
    priority={priority}
    referrerPolicy="no-referrer"
    onError={() => {
      if (source !== fallbackSource) setSource(fallbackSource);
    }}
  />;
}
