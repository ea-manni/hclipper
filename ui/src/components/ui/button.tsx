import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import { useMotionSpring } from "../../hooks/useMotionSpring"
import { Springs } from "../../lib/motion"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold shadow-md",
        destructive:
          "bg-red-500 text-white hover:bg-red-400 font-bold",
        outline:
          "border border-white/10 bg-transparent hover:bg-white/5 text-slate-200",
        secondary:
          "bg-white/10 text-white hover:bg-white/20",
        ghost: "hover:bg-white/5 text-slate-300",
        link: "text-amber-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Use deterministic springs for hover/active states instead of CSS transitions
    const [isHovered, setIsHovered] = React.useState(false);
    const [isActive, setIsActive] = React.useState(false);

    const targetScale = isActive ? 0.95 : isHovered ? 1.02 : 1.0;
    const scale = useMotionSpring(targetScale, Springs.snappy);

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(true);
      onMouseEnter?.(e);
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsHovered(false);
      setIsActive(false);
      onMouseLeave?.(e);
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsActive(true);
      onMouseDown?.(e);
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsActive(false);
      onMouseUp?.(e);
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{
          ...style,
          transform: `scale(${scale})`,
          // Note: we remove transition from the class and rely on the spring hook
        }}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
