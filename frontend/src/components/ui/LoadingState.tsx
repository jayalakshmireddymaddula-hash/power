import React from "react";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  className = "py-16",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
      <p className="text-xs font-medium text-slate-400 tracking-wide">{message}</p>
    </div>
  );
};
