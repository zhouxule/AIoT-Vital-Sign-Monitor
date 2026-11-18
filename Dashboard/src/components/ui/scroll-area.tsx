import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal'
}

function ScrollArea({ className, children, orientation = 'vertical', ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        "relative",
        orientation === 'vertical' ? "overflow-y-auto" : "overflow-x-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { ScrollArea }
