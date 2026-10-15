import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "primary" | "outline";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}) => {
  const base = "inline-flex items-center font-medium rounded-full tracking-wide";

  const variants: Record<string, string> = {
    default: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    primary: "bg-indigo-600/25 text-indigo-300 border border-indigo-500/40",
    outline: "bg-transparent text-slate-300 border border-slate-700",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    danger: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    info: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    neutral: "bg-slate-700/40 text-slate-300 border border-slate-600/30",
  };

  const sizes = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  };

  return (
    <span className={twMerge(clsx(base, variants[variant] || variants.default, sizes[size], className))} {...props}>
      {children}
    </span>
  );
};
