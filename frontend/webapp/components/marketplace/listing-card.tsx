"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import type { Listing } from "@/lib/api/market"
import { buyTicket } from "@/lib/api/market"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleBuy = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await buyTicket(listing.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to buy ticket")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{listing.event_name}</CardTitle>
        <CardDescription>
          Ticket #{listing.ticket_id} • {listing.price} ETH
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Seller: {listing.seller_address.slice(0, 6)}...{listing.seller_address.slice(-4)}
          </div>
          <Button
            onClick={handleBuy}
            disabled={isLoading || listing.status !== "active"}
            variant="outline"
          >
            {isLoading ? "Buying..." : "Buy Now"}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}