import * as React from "react";

interface ProgressProps {
  value?: number;
  className?: string;
}

export function Progress({
  value = 0,
  className = "",
}: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}