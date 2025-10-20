"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getListings, type Listing } from "@/lib/api/market"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, MapPin, DollarSign, Search, Filter, ShoppingCart, Plus } from "lucide-react"

// Mock listings for design purposes
const mockListings: Listing[] = [
  {
    id: "1",
    event_id: "1",
    event_name: "Taylor Swift | The Eras Tour",
    ticket_id: "ticket_1",
    seller_address: "0x1234...5678",
    price: "150.00",
    status: "active"
  },
  {
    id: "2",
    event_id: "2", 
    event_name: "Hamilton",
    ticket_id: "ticket_2",
    seller_address: "0x5678...9abc",
    price: "200.00",
    status: "active"
  },
  {
    id: "3",
    event_id: "3",
    event_name: "NBA Finals Game 1", 
    ticket_id: "ticket_3",
    seller_address: "0x9abc...def0",
    price: "450.00",
    status: "active"
  }
]

function ListingsGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)

    const fetchListings = async () => {
      try {
        setLoading(true)
        
        if (token) {
          const listingsData = await getListings()
          setListings(listingsData)
        } else {
          // Use mock data for demo when not authenticated
          setListings(mockListings)
        }
        
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch listings')
        // If we get an auth error, fall back to mock data
        if (err instanceof Error && err.message.includes('Failed to fetch')) {
          setListings(mockListings)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  useEffect(() => {
    // Filter listings based on search query
    if (searchQuery.trim()) {
      const filtered = listings.filter(listing =>
        listing.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.seller_address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredListings(filtered)
    } else {
      setFilteredListings(listings)
    }
  }, [listings, searchQuery])

  const handleListingClick = (listingId: string) => {
    router.push(`/marketplace/${listingId}`)
  }

  const handleSellTicket = () => {
    if (!isAuthenticated) {
      router.push('/register')
    } else {
      // TODO: Open sell ticket dialog
      alert('Sell ticket functionality coming soon!')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                Ticket Marketplace
              </h1>
              <p className="text-lg text-gray-600">
                Buy and sell authentic event tickets securely
              </p>
            </div>
            <Button 
              onClick={handleSellTicket}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Sell Tickets
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search listings, events, or sellers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg border-gray-200"
              />
            </div>
            <Button variant="outline" className="h-12 px-6">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {searchQuery && (
            <p className="text-gray-600 mb-4">
              {filteredListings.length} listings found for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Listings Grid */}
        {loading ? (
          <ListingsGridSkeleton />
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? "No listings found" : "No active listings"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 
                  "Try adjusting your search terms or browse all listings." : 
                  "Be the first to list a ticket for sale!"
                }
              </p>
              {searchQuery ? (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              ) : (
                <Button onClick={handleSellTicket}>
                  <Plus className="h-4 w-4 mr-2" />
                  List Your First Ticket
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card 
                key={listing.id}
                className="group cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                onClick={() => handleListingClick(listing.id)}
              >
                <div className="relative">
                  <div className="h-32 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 flex items-center justify-center">
                    <div className="text-center text-white">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-80" />
                      <p className="text-xs opacity-90">Resale Ticket</p>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4">
                    <Badge 
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      {listing.status === 'active' ? 'Available' : listing.status}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {listing.event_name}
                  </h3>
                  
                  <div className="space-y-2 text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">Price: ${listing.price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">Seller: {formatAddress(listing.seller_address)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500 block">Resale Price</span>
                      <span className="text-xl font-semibold text-gray-900">
                        ${listing.price}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-green-600 group-hover:text-white group-hover:border-green-600 transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}