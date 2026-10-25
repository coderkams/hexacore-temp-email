import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "edge";
  size?: "default" | "sm" | "lg" | "icon" | "edge";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles: Record<string, string> = {
      default: "bg-[#0d1f4a] text-white hover:bg-[#091228] shadow-sm",
      destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
      outline:
        "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 shadow-xs",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-xs",
      ghost: "hover:bg-slate-100 hover:text-slate-900",
      link: "text-[#1a6fd4] underline-offset-4 hover:underline",
      edge: "bg-[#0d1f4a] hover:bg-[#1a6fd4] text-white border border-white/30 shadow-md hover:shadow-lg",
    };

    const sizeStyles: Record<string, string> = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-8 w-8 rounded-full p-0 flex items-center justify-center",
      edge: "h-7 w-7 rounded-full p-0 shrink-0 flex items-center justify-center",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6fd4]/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          variantStyles[variant] || variantStyles.default,
          sizeStyles[size] || sizeStyles.default,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
