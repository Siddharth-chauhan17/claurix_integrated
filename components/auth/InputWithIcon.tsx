import { forwardRef } from "react";

interface InputWithIconProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
}

export const InputWithIcon = forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon, className = "", ...props }, ref) => {
    return (
      <div className="relative flex w-full items-center">
        <span className="pointer-events-none absolute left-3 flex h-5 w-5 text-slate-400">
          {icon}
        </span>
        <input
          ref={ref}
          className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

InputWithIcon.displayName = "InputWithIcon";
