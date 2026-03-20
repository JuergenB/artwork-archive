"use client"

import { useState } from "react"
import Image, { type ImageProps } from "next/image"
import { ImageIcon } from "lucide-react"

interface ImageWithFallbackProps extends Omit<ImageProps, "onError"> {
  fallbackType?: "initials" | "icon"
  initials?: string
}

export function ImageWithFallback({
  fallbackType = "icon",
  initials,
  className,
  ...props
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    const isCircle = className?.includes("rounded-full")
    return (
      <div
        className={`flex items-center justify-center bg-muted ${isCircle ? "rounded-full" : "rounded"}`}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      >
        {fallbackType === "initials" && initials ? (
          <span className="text-sm text-muted-foreground">{initials}</span>
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <Image
      {...props}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
