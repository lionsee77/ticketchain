"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import type { MarketListing } from "@/lib/api/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface ListingCardProps {
  listing: MarketListing
}

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const handleBuy = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)
      
      // Call the API to buy the ticket - backend uses ticket_id to identify listings
      const result = await apiClient.buyListedTicket({
        ticket_id: listing.ticket_id,
      })
      
      setSuccess(result.message || "Ticket purchased successfully!")
      
      // Refresh the page to show updated listings after a short delay
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to buy ticket"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{listing.event_name || `Event #${listing.event_id}`}</CardTitle>
        <CardDescription>
          Ticket #{listing.ticket_id} • {(parseFloat(listing.price) / 1e18).toFixed(4)} ETH
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Seller: {listing.seller_address.slice(0, 6)}...{listing.seller_address.slice(-4)}
          </div>
          <Button
            onClick={handleBuy}
            disabled={isLoading || !listing.is_active}
            variant="outline"
          >
            {isLoading ? "Buying..." : "Buy Now"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 mt-2">{success}</p>
        )}
      </CardContent>
    </Card>
  )
}