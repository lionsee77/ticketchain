"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ticket, Calendar, MapPin, DollarSign, CheckCircle, XCircle, ShoppingCart, Loader2, X } from "lucide-react"
import { apiClient, Ticket as TicketType, MarketListing } from "@/lib/api/client"

export default function MyTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketType[]>([])
  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingListings, setLoadingListings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("tickets")

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    if (activeTab === "listings") {
      loadListings()
    }
  }, [activeTab])

  const loadTickets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.getMyTickets()
      setTickets(response.tickets || [])
    } catch (err) {
      console.error('Failed to load tickets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const loadListings = async () => {
    setLoadingListings(true)
    try {
      const response = await apiClient.getMyListings()
      setListings(response.listings || [])
    } catch (err) {
      console.error('Failed to load listings:', err)
    } finally {
      setLoadingListings(false)
    }
  }

  const handleDelist = async (ticketId: number) => {
    try {
      await apiClient.delistTicket(ticketId)
      // Refresh listings
      loadListings()
      // Also refresh tickets to update the ticket status
      loadTickets()
    } catch (err) {
      console.error('Failed to delist ticket:', err)
      alert(err instanceof Error ? err.message : 'Failed to delist ticket')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      // Date is Unix timestamp as string
      const timestamp = parseInt(dateString)
      if (isNaN(timestamp)) return dateString
      const date = new Date(timestamp * 1000)
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatPrice = (priceWei: string) => {
    try {
      const wei = BigInt(priceWei)
      const eth = Number(wei) / Math.pow(10, 18)
      return `${eth.toFixed(4)} ETH`
    } catch {
      return '0 ETH'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Tickets</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={loadTickets}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Tickets</h1>
          <p className="text-lg text-gray-600">
            View and manage all your purchased tickets and listings
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="tickets">My Tickets ({tickets.length})</TabsTrigger>
            <TabsTrigger value="listings">My Listings ({listings.length})</TabsTrigger>
          </TabsList>

          {/* My Tickets Tab */}
          <TabsContent value="tickets">
            {tickets.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-12 pb-12 text-center">
                  <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tickets Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start exploring events and purchase your first ticket!
                  </p>
                  <Button onClick={() => router.push('/events')}>
                    Browse Events
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tickets.map((ticket) => (
                    <Card 
                      key={ticket.ticket_id} 
                      className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
                      onClick={() => router.push(`/tickets/${ticket.ticket_id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge 
                            variant={ticket.is_used ? "secondary" : "default"}
                            className={ticket.is_used ? 'bg-gray-500' : 'bg-green-500'}
                          >
                            {ticket.is_used ? 'Used' : 'Active'}
                          </Badge>
                          <span className="text-xs text-gray-500">ID: #{ticket.ticket_id}</span>
                        </div>
                        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                          {ticket.event_name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{ticket.event_location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(ticket.event_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span>{formatPrice(ticket.ticket_price)}</span>
                          </div>
                          
                          {ticket.is_used ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>Ticket has been used</span>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-4 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/marketplace?sell=${ticket.ticket_id}`)
                              }}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              List for Resale
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Stats Summary */}
                <Card className="mt-8">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-3xl font-bold text-blue-600">{tickets.length}</p>
                        <p className="text-sm text-gray-600 mt-1">Total Tickets</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-600">
                          {tickets.filter(t => !t.is_used).length}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Active</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-600">
                          {tickets.filter(t => t.is_used).length}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Used</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-purple-600">
                          {new Set(tickets.map(t => t.event_id)).size}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Events</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* My Listings Tab */}
          <TabsContent value="listings">
            {loadingListings ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              </div>
            ) : listings.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="pt-12 pb-12 text-center">
                  <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Listings</h3>
                  <p className="text-gray-600 mb-6">
                    You haven&apos;t listed any tickets for resale yet.
                  </p>
                  <Button onClick={() => setActiveTab("tickets")}>
                    View My Tickets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card 
                    key={listing.ticket_id} 
                    className="group hover:shadow-lg transition-all duration-300"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge 
                          variant="default"
                          className={listing.is_active ? 'bg-green-500' : 'bg-gray-500'}
                        >
                          {listing.is_active ? 'Listed' : 'Sold'}
                        </Badge>
                        <span className="text-xs text-gray-500">Ticket #{listing.ticket_id}</span>
                      </div>
                      <CardTitle className="text-xl">
                        {listing.event_name || `Event #${listing.event_id}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-semibold">
                            {(parseFloat(listing.price) / 1e18).toFixed(4)} ETH
                          </span>
                        </div>
                        
                        {listing.is_active && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full mt-4"
                            onClick={() => handleDelist(listing.ticket_id)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Delist Ticket
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
