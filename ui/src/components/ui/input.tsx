import * as React from "react"
import { cn } from "../../lib/utils"
import { useMotionSpring } from "../../hooks/useMotionSpring"
import { Springs } from "../../lib/motion"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onFocus, onBlur, style, ...props }, ref) => {

    // Physics-based scale and border glow instead of CSS transitions
    const [isFocused, setIsFocused] = React.useState(false);
    const scale = useMotionSpring(isFocused ? 1.01 : 1.0, Springs.snappy);

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-white/10 bg-slate-900/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 text-slate-100",
          className
        )}
        ref={ref}
        style={{
          ...style,
          transform: `scale(${scale})`,
        }}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
