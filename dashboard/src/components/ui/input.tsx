import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-gray-800 bg-secondary px-4 py-2.5 text-sm text-gray-100 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onWheel={(e) => {
          if (type === 'number') {
            e.currentTarget.blur();
          }
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
