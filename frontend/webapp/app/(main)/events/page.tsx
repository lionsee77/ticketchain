"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getEvents, type Event } from "@/lib/api/events"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateEventDialog } from "@/components/events/create-event-dialog"
import { BuyTicketsDialog } from "@/components/events/buy-tickets-dialog"
import { testApiConnection, testLocalStorage } from "@/lib/debug"
import { Calendar, MapPin, Users, Search, Filter, Plus, Bug } from "lucide-react"

// Mock events for design purposes
const mockEvents: Event[] = [
  {
    id: "1",
    name: "Taylor Swift | The Eras Tour",
    description: "Experience the magic of Taylor Swift's biggest tour ever with hits from every era of her career.",
    venue: "MetLife Stadium",
    datetime: "2025-06-15T19:00:00",
    ticket_price: "89.00",
    total_supply: 50000,
    available_tickets: 12500,
    owner_wallet_address: "0x1234..."
  },
  {
    id: "2",
    name: "Hamilton",
    description: "The revolutionary musical about Alexander Hamilton, featuring the original Broadway cast.",
    venue: "Richard Rodgers Theatre",
    datetime: "2025-07-22T20:00:00",
    ticket_price: "149.00",
    total_supply: 1400,
    available_tickets: 350,
    owner_wallet_address: "0x5678..."
  },
  {
    id: "3",
    name: "NBA Finals Game 1",
    description: "Don't miss the first game of the NBA Finals - championship basketball at its finest.",
    venue: "Chase Center",
    datetime: "2025-06-01T18:00:00",
    ticket_price: "299.00",
    total_supply: 18000,
    available_tickets: 450,
    owner_wallet_address: "0x9abc..."
  }
]

function EventsGridSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    
    // Initialize search from URL params
    const search = searchParams.get('search')
    if (search) {
      setSearchQuery(search)
    }

    const fetchEvents = async () => {
      try {
        setLoading(true)
        
        if (token) {
          const eventsData = await getEvents()
          setEvents(eventsData)
        } else {
          // Use mock data for demo when not authenticated
          setEvents(mockEvents)
        }
        
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events')
        // If we get an auth error, fall back to mock data
        if (err instanceof Error && err.message.includes('authorization')) {
          setEvents(mockEvents)
          localStorage.removeItem('token')
          setIsAuthenticated(false)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [searchParams])

  useEffect(() => {
    // Filter events based on search query
    if (searchQuery.trim()) {
      const filtered = events.filter(event =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredEvents(filtered)
    } else {
      setFilteredEvents(events)
    }
  }, [events, searchQuery])

  const handleEventClick = (eventId: string) => {
    // Individual event detail pages aren't implemented yet
    // For now, do nothing or could show a "Coming soon" message
    console.log(`Event detail page for event ${eventId} not implemented yet`)
  }

  const refreshEvents = async () => {
    // Refresh the events list after creating a new event
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const eventsData = await getEvents()
        setEvents(eventsData)
        setError(null)
      }
    } catch (err) {
      console.error('Failed to refresh events:', err)
    }
  }

  const getStatusBadge = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage > 50) {
      return { text: "On Sale", className: "bg-green-100 text-green-800" }
    } else if (percentage > 10) {
      return { text: "Selling Fast", className: "bg-orange-100 text-orange-800" }
    } else {
      return { text: "Few Left", className: "bg-red-100 text-red-800" }
    }
  }

  const formatDate = (datetime: string) => {
    const date = new Date(datetime)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      })
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
                Discover Events
              </h1>
              <p className="text-lg text-gray-600">
                Find amazing experiences happening near you
              </p>
            </div>
            <div className="flex gap-2">
              {isAuthenticated ? (
                <CreateEventDialog onEventCreated={refreshEvents} />
              ) : (
                <Button 
                  onClick={() => router.push('/register')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sign In to Create Event
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => {
                  console.log('=== Starting Debug Tests ===');
                  testLocalStorage();
                  testApiConnection();
                }}
                className="text-gray-600 border-gray-300"
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug API
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events, venues, or artists..."
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
              {filteredEvents.length} events found for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Events Grid */}
        {loading ? (
          <EventsGridSkeleton />
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery ? "No events found" : "No events available"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 
                  "Try adjusting your search terms or browse all events." : 
                  "Check back soon for exciting events!"
                }
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const status = getStatusBadge(event.available_tickets, event.total_supply)
              const { date, time } = formatDate(event.datetime)
              
              return (
                <Card 
                  key={event.id}
                  className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                >
                  <div className="relative">
                    <div className="h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-80" />
                        <p className="text-sm opacity-90">Event Image</p>
                      </div>
                    </div>
                    <div className="absolute top-4 left-4">
                      <Badge 
                        variant="secondary"
                        className={status.className}
                      >
                        {status.text}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {event.name}
                    </h3>
                    
                    <div className="space-y-2 text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{date} • {time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">
                          {event.available_tickets} of {event.total_supply} available
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-500 block">Starting at</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ${event.ticket_price}
                        </span>
                      </div>
                      <BuyTicketsDialog 
                        event={event} 
                        onTicketsPurchased={refreshEvents}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}