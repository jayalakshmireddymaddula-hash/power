import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>{label}</span>
          </label>
        )}
        <input
          ref={ref}
          className={twMerge(
            clsx(
              "w-full px-3.5 py-2 text-sm bg-slate-900/80 border rounded-lg text-slate-100 placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
              error ? "border-rose-500 focus:border-rose-500" : "border-slate-700/80 focus:border-indigo-500",
              className
            )
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
