"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Search, Ticket } from "lucide-react"
import { Input } from "@/components/ui/input"

// Mock featured events for the homepage
const featuredEvents = [
  {
    id: "1",
    name: "Taylor Swift | The Eras Tour",
    venue: "MetLife Stadium",
    location: "East Rutherford, NJ",
    date: "2025-06-15",
    time: "7:00 PM",
    price: "Starting at $89",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=300&fit=crop",
    category: "Music",
    status: "On Sale"
  },
  {
    id: "2",
    name: "Hamilton",
    venue: "Richard Rodgers Theatre",
    location: "New York, NY",
    date: "2025-07-22",
    time: "8:00 PM",
    price: "Starting at $149",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=300&fit=crop",
    category: "Theater",
    status: "Selling Fast"
  },
  {
    id: "3",
    name: "NBA Finals Game 1",
    venue: "Chase Center",
    location: "San Francisco, CA",
    date: "2025-06-01",
    time: "6:00 PM",
    price: "Starting at $299",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&h=300&fit=crop",
    category: "Sports",
    status: "Few Left"
  }
]

export default function HomePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery)}`)
    } else {
      router.push("/events")
    }
  }

  const handleEventClick = (eventId: string) => {
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
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Featured Events
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Don't miss out on these incredible experiences happening near you
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {featuredEvents.map((event) => (
              <Card 
                key={event.id} 
                className="group cursor-pointer overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                onClick={() => handleEventClick(event.id)}
              >
                <div className="relative">
                  <img
                    src={event.image}
                    alt={event.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge 
                      variant="secondary"
                      className={`${
                        event.status === 'On Sale' ? 'bg-green-100 text-green-800' :
                        event.status === 'Selling Fast' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4">
                    <Badge variant="outline" className="bg-white/90">
                      {event.category}
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
                      <span className="text-sm">
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })} • {event.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      {event.price}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
                    >
                      Get Tickets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              onClick={() => router.push('/events')}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3"
            >
              View All Events
            </Button>
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