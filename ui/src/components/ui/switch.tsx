import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "../../lib/utils"
import { useMotionSpring } from "../../hooks/useMotionSpring"
import { Springs } from "../../lib/motion"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const [checked, setChecked] = React.useState(props.checked || props.defaultChecked || false);

  // Update internal state if controlled from outside
  React.useEffect(() => {
    if (props.checked !== undefined) {
      setChecked(props.checked);
    }
  }, [props.checked]);

  const handleCheckedChange = (c: boolean) => {
    if (props.checked === undefined) {
      setChecked(c);
    }
    props.onCheckedChange?.(c);
  };

  // 1 is checked, 0 is unchecked
  const progress = useMotionSpring(checked ? 1 : 0, Springs.snappy);

  // Interpolate thumb translation. Assuming thumb size 1.25rem (20px), container 2.25rem (36px).
  // Translation range: 0px to 16px.
  const thumbTranslateX = progress * 16;

  // Interpolate background color manually or let useMotionSpring handle just the transform
  // For color, Radix handles data-[state] but we can also use style

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-amber-400 data-[state=unchecked]:bg-slate-700",
        className
      )}
      {...props}
      ref={ref}
      onCheckedChange={handleCheckedChange}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0"
        )}
        style={{
          transform: `translateX(${thumbTranslateX}px)`,
        }}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
