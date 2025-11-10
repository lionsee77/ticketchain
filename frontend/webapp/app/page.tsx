"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Search, Ticket, Shield, Coins, TrendingUp, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { apiClient, Event } from "@/lib/api/client"

// Utility functions
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatPrice = (priceWei: string) => {
  const priceEth = parseFloat(priceWei) / Math.pow(10, 18)
  return `${priceEth.toFixed(4)} ETH`
}

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAllEvents()
      setEvents(response.events || [])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery)}`)
    } else {
      router.push("/events")
    }
  }

  const handleEventClick = (eventId: number) => {
    router.push(`/events/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <Ticket className="h-12 w-12 text-blue-600 mr-4" />
              <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TicketChain
              </h1>
            </div>
            <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed">
              Discover amazing events, secure authentic tickets, and create unforgettable memories
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="flex gap-2 p-2 bg-white rounded-full shadow-lg border">
                <Search className="h-5 w-5 text-gray-400 ml-4 mt-3" />
                <Input
                  placeholder="Search for artists, events, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="border-0 text-lg px-4 py-3 focus-visible:ring-0"
                />
                <Button 
                  onClick={handleSearch}
                  className="rounded-full px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Search
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                10M+ Happy Customers
              </span>
              <span className="flex items-center gap-1">
                <Ticket className="h-4 w-4" />
                100% Secure Transactions
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                50K+ Events Monthly
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {searchQuery ? 'Search Results' : 'Featured Events'}
              </h2>
              <p className="text-lg text-gray-600">
                {searchQuery 
                  ? `Found ${filteredEvents.length} events matching "${searchQuery}"` 
                  : 'Discover amazing blockchain-powered events happening now'
                }
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/events')}>
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredEvents.slice(0, 6).map((event) => (
                <Card 
                  key={event.id} 
                  className="group cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  onClick={() => handleEventClick(event.id)}
                >
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Ticket className="h-16 w-16 text-white/50" />
                    <div className="absolute top-4 right-4">
                      <Badge 
                        variant={event.isActive ? "default" : "secondary"}
                        className={event.isActive ? 'bg-green-500' : ''}
                      >
                        {event.isActive ? 'On Sale' : 'Closed'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {event.name}
                    </h3>
                    <div className="space-y-2 text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{event.ticketsSold} / {event.totalTickets} sold</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-2xl font-bold text-blue-600">
                          {formatPrice(event.ticketPrice)}
                        </span>
                      </div>
                      <Button size="sm" className="group-hover:bg-blue-600">
                        Buy Tickets
                      </Button>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${(event.ticketsSold / event.totalTickets * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {event.totalTickets - event.ticketsSold} tickets remaining
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 max-w-2xl mx-auto">
              <CardContent>
                <Ticket className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchQuery ? 'No events found' : 'No events available'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery 
                    ? 'Try searching for different keywords or check back later.'
                    : 'Check back later for upcoming events or create your own!'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => router.push('/events/create')}>
                    Create Your Event
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose TicketChain?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience the future of ticketing with blockchain technology
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Secure & Authentic
                </h3>
                <p className="text-gray-600">
                  Blockchain-backed NFT tickets ensure authenticity and prevent counterfeiting
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                  <Coins className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Loyalty Rewards
                </h3>
                <p className="text-gray-600">
                  Earn loyalty points with every purchase and get exclusive discounts
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Resale Marketplace
                </h3>
                <p className="text-gray-600">
                  Safely buy and sell tickets on our trusted peer-to-peer marketplace
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Music", icon: "🎵", color: "from-pink-400 to-red-400" },
              { name: "Sports", icon: "⚽", color: "from-green-400 to-blue-400" },
              { name: "Theater", icon: "🎭", color: "from-purple-400 to-pink-400" },
              { name: "Comedy", icon: "😂", color: "from-yellow-400 to-orange-400" }
            ].map((category) => (
              <Card 
                key={category.name}
                className="group cursor-pointer border-0 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                onClick={() => router.push(`/events?category=${category.name.toLowerCase()}`)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${category.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}