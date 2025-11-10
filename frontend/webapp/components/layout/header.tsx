"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Ticket, Menu, User, LogOut, Settings, Coins } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import { apiClient } from "@/lib/api/client"

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const [loyaltyPoints, setLoyaltyPoints] = useState<string | null>(null)

  // Fetch loyalty points when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      apiClient.getLoyaltyBalance()
        .then((data) => {
          // Convert from wei with decimals to human-readable format
          // Balance is in wei with decimals (e.g., 18 decimals)
          const balanceWei = BigInt(data.balance)
          const decimals = data.decimals || 18
          const divisor = BigInt(10 ** decimals)
          const points = Number(balanceWei / divisor)
          setLoyaltyPoints(String(points))
        })
        .catch((err) => {
          console.error('Failed to fetch loyalty points:', err)
        })
    } else {
      setLoyaltyPoints(null)
    }
  }, [isAuthenticated])

  const handleLogout = () => {
    logout()
    setLoyaltyPoints(null)
    router.push('/')
  }

  const handleAuthClick = () => {
    router.push('/register')
  }

  // Format loyalty points for display
  const formatPoints = (points: string) => {
    const num = parseInt(points)
    if (isNaN(num)) return '0'
    return num.toLocaleString()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <Ticket className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TicketChain
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => router.push('/')}
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              Home
            </button>
            <button 
              onClick={() => router.push('/events')}
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              Events
            </button>
            <button 
              onClick={() => router.push('/marketplace')}
              className="text-sm font-medium hover:text-blue-600 transition-colors"
            >
              Marketplace
            </button>
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {/* Loyalty Points Display */}
              {loyaltyPoints !== null && (
                <button
                  onClick={() => router.push('/loyalty')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full hover:from-amber-500 hover:to-orange-600 transition-all"
                >
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">{formatPoints(loyaltyPoints)}</span>
                  <span className="text-xs opacity-90">pts</span>
                </button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {user?.username || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/my-tickets')}>
                    <Ticket className="h-4 w-4 mr-2" />
                    My Tickets
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/loyalty')}>
                    <Coins className="h-4 w-4 mr-2" />
                    Loyalty Points
                    {loyaltyPoints && (
                      <Badge variant="secondary" className="ml-auto">
                        {formatPoints(loyaltyPoints)}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleAuthClick}>
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          )}
          
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={() => router.push('/events')}
          >
            Browse Events
          </Button>
          
          {/* Mobile menu button */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}