'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { apiClient } from '@/lib/api/client'
import { Card, CardContent } from "@/components/ui/card"

interface SellTicketsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface OwnedTicket {
  ticket_id: number
  event_id: number
  event_name: string
  event_location: string
  event_date: string
  ticket_price: string
  is_used: boolean
  owner_address: string
}

export function SellTicketsDialog({ open, onOpenChange, onSuccess }: SellTicketsDialogProps) {
  const [ownedTickets, setOwnedTickets] = useState<OwnedTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<OwnedTicket | null>(null)
  const [priceEth, setPriceEth] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch user's tickets when dialog opens
  useEffect(() => {
    if (open) {
      fetchUserTickets()
    }
  }, [open])

  const fetchUserTickets = async () => {
    setLoadingTickets(true)
    setError(null)
    try {
      const response = await apiClient.getMyTickets()
      // Filter out used tickets since they can't be listed
      const availableTickets = response.tickets.filter(ticket => !ticket.is_used)
      setOwnedTickets(availableTickets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoadingTickets(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTicket) {
      setError('Please select a ticket to list')
      return
    }

    if (!priceEth) {
      setError('Please enter a price')
      return
    }

    const priceEthNum = parseFloat(priceEth)
    if (isNaN(priceEthNum) || priceEthNum <= 0) {
      setError('Please enter a valid price')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert ETH to wei (1 ETH = 10^18 wei)
      const priceWei = Math.floor(priceEthNum * Math.pow(10, 18))

      console.log('🔍 Listing ticket:', { ticketId: selectedTicket.ticket_id, priceWei })

      // First check if marketplace is approved
      const approvalStatus = await apiClient.checkMarketApprovalStatus()
      console.log('📋 Approval status:', approvalStatus)

      // If not approved, approve it first
      if (!approvalStatus.is_approved) {
        console.log('✅ Approving marketplace...')
        await apiClient.approveMarket()
      }

      // Then list the ticket (backend gets seller from JWT token)
      console.log('📝 Calling listTicket API...')
      const result = await apiClient.listTicket({
        ticket_id: selectedTicket.ticket_id,
        price: priceWei
      })
      console.log('✅ List result:', result)

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
        // Reset form
        setSelectedTicket(null)
        setPriceEth('')
        // Call refresh callback if provided
        if (onSuccess) {
          onSuccess()
        }
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setSuccess(false)
      setSelectedTicket(null)
      setPriceEth('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sell Your Ticket</DialogTitle>
          <DialogDescription>
            List your ticket on the marketplace for resale
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Ticket Listed Successfully!
            </h3>
            <p className="text-sm text-gray-600 text-center">
              Your ticket is now available on the marketplace
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Ticket Selection */}
              <div className="space-y-2">
                <Label>Select Ticket to List</Label>
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading your tickets...
                  </div>
                ) : ownedTickets.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    No available tickets to list. Only unused tickets can be listed for resale.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {ownedTickets.map((ticket) => (
                      <Card
                        key={ticket.ticket_id}
                        className={`cursor-pointer transition-colors ${selectedTicket?.ticket_id === ticket.ticket_id
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                          }`}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-sm">{ticket.event_name}</h4>
                              <p className="text-xs text-gray-600">{ticket.event_location}</p>
                              <p className="text-xs text-gray-500">
                                Ticket #{ticket.ticket_id} • {new Date(parseInt(ticket.event_date) * 1000).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Original Price</p>
                              <p className="text-sm font-medium">
                                {(parseInt(ticket.ticket_price) / Math.pow(10, 18)).toFixed(4)} ETH
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Price Input */}
              {selectedTicket && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price_eth" className="text-right">
                    Price (ETH)
                  </Label>
                  <Input
                    id="price_eth"
                    type="number"
                    placeholder="0.1"
                    className="col-span-3"
                    value={priceEth}
                    onChange={(e) => setPriceEth(e.target.value)}
                    disabled={loading}
                    min="0"
                    step="0.001"
                  />
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedTicket || loadingTickets}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                List Ticket
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}