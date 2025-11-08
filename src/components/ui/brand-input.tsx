import * as React from "react"
import { cn } from "@/lib/utils"

export interface BrandInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const BrandInput = React.forwardRef<HTMLInputElement, BrandInputProps>(
  ({ className, type, label, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
BrandInput.displayName = "BrandInput"

export { BrandInput }