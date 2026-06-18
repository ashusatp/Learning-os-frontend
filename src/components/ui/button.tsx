import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-out outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_1px_2px_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:shadow-[0_3px_12px_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:brightness-110 active:brightness-95 active:shadow-[0_1px_1px_0_rgba(0,0,0,0.1)] active:translate-y-px",
        outline:
          "border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md active:bg-accent/80 active:translate-y-px",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md active:bg-secondary/70 active:translate-y-px",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent/80",
        destructive:
          "bg-gradient-to-b from-destructive to-destructive/85 text-white shadow-[0_1px_2px_0_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:shadow-[0_3px_12px_0_rgba(220,38,38,0.25),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:brightness-110 active:brightness-95 active:translate-y-px",
        link: "text-primary underline-offset-4 hover:underline",
        glow: "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_6px_0_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_3px_var(--primary)/30,0_2px_6px_0_rgba(0,0,0,0.1)] hover:brightness-110 active:brightness-95 active:translate-y-px",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
        lg: "h-11 gap-2 rounded-xl px-6 text-[15px]",
        icon: "size-9",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
