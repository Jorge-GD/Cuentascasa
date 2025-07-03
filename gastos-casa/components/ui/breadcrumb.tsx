import React from "react"
import { ChevronRight, Home } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  showHome?: boolean
}

const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps
>(({ items, className, showHome = true }, ref) => {
  return (
    <nav
      ref={ref}
      aria-label="Breadcrumb"
      className={cn("flex", className)}
    >
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {showHome && (
          <li className="inline-flex items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </li>
        )}
        
        {items.map((item, index) => (
          <li key={index}>
            <div className="flex items-center">
              {(showHome || index > 0) && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
              )}
              {item.href && !item.current ? (
                <Link
                  href={item.href}
                  className="ml-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors md:ml-2"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "ml-1 text-sm font-medium md:ml-2",
                    item.current 
                      ? "text-foreground" 
                      : "text-muted-foreground"
                  )}
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
})
Breadcrumb.displayName = "Breadcrumb"

export { Breadcrumb }