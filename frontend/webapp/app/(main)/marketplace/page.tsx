"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient, type MarketListing } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Filter, ShoppingCart, Plus } from "lucide-react"
import { SellTicketsDialog } from "@/components/marketplace/sell-tickets-dialog"
import { useAuth } from "@/hooks/useAuth"
import { ListingCard } from "@/components/marketplace/listing-card"

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
  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredListings, setFilteredListings] = useState<MarketListing[]>([])
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const fetchListings = async () => {
    try {
      setLoading(true)
      
      console.log('🔄 Fetching marketplace listings...')
      const result = await apiClient.getMarketListings()
      console.log('📦 Received listings:', result.listings)
      console.log('📊 Total listings:', result.listings.length)
      
      // Check for duplicates
      const ticketIds = result.listings.map(l => l.ticket_id)
      const uniqueIds = new Set(ticketIds)
      if (ticketIds.length !== uniqueIds.size) {
        console.warn('⚠️ DUPLICATE TICKET IDs DETECTED!', {
          total: ticketIds.length,
          unique: uniqueIds.size,
          ticketIds
        })
      }
      
      setListings(result.listings)
    } catch (err) {
      console.error('Error fetching listings:', err)
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListings()
  }, [])

  useEffect(() => {
    // Filter listings based on search query - ensure listings is always an array
    const listingsArray = Array.isArray(listings) ? listings : []
    
    if (searchQuery.trim()) {
      const filtered = listingsArray.filter(listing =>
        (listing.event_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        listing.seller_address.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredListings(filtered)
    } else {
      setFilteredListings(listingsArray)
    }
  }, [listings, searchQuery])

  const handleSellTicket = () => {
    if (!isAuthenticated) {
      router.push('/register')
    } else {
      setSellDialogOpen(true)
    }
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
              {filteredListings.length} listings found for &ldquo;{searchQuery}&rdquo;
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
            {Array.isArray(filteredListings) && filteredListings.map((listing) => (
              <ListingCard 
                key={listing.ticket_id}
                listing={listing}
              />
            ))}
          </div>
        )}
      </div>
      
      <SellTicketsDialog 
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        onSuccess={fetchListings}
      />
    </div>
  )
}