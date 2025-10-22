"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <Link href="/events" legacyBehavior passHref>
            <NavigationMenuLink className={cn(
              navigationMenuTriggerStyle(),
              pathname === "/events" && "bg-accent text-accent-foreground"
            )}>
              Events
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/marketplace" legacyBehavior passHref>
            <NavigationMenuLink className={cn(
              navigationMenuTriggerStyle(),
              pathname === "/marketplace" && "bg-accent text-accent-foreground"
            )}>
              Marketplace
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

export function MobileNav() {
  return (
    <nav className="md:hidden flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/events"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Events
      </Link>
      <Link
        href="/marketplace"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Marketplace
      </Link>
    </nav>
  )
}