'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { mainNavigation, type NavItem } from '@/lib/navigation'
import { Button } from '@/components/ui/button'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="pb-12 w-64">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Gastos Casa
          </h2>
          <div className="space-y-1">
            {mainNavigation.map((item) => (
              <SidebarNavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  return (
    <div>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start",
          isActive && "bg-muted font-medium text-primary"
        )}
        asChild
      >
        <Link href={item.href}>
          <Icon className="mr-2 h-4 w-4" />
          {item.title}
          {item.badge && (
            <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
              {item.badge}
            </span>
          )}
        </Link>
      </Button>
      
      {item.children && isActive && (
        <div className="ml-4 mt-1 space-y-1">
          {item.children.map((child) => {
            const childIsActive = pathname === child.href
            const ChildIcon = child.icon
            
            return (
              <Button
                key={child.href}
                variant={childIsActive ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  childIsActive && "bg-muted font-medium text-primary"
                )}
                asChild
              >
                <Link href={child.href}>
                  <ChildIcon className="mr-2 h-3 w-3" />
                  {child.title}
                </Link>
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}