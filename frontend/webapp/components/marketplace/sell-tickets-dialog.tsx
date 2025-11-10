'use client'

import { useState } from 'react'
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

interface SellTicketsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SellTicketsDialog({ open, onOpenChange, onSuccess }: SellTicketsDialogProps) {
  const [formData, setFormData] = useState({
    ticket_id: '',
    price_eth: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.ticket_id || !formData.price_eth) {
      setError('Please fill in all fields')
      return
    }

    const ticketId = parseInt(formData.ticket_id)
    const priceEth = parseFloat(formData.price_eth)

    if (isNaN(ticketId) || ticketId < 0) {
      setError('Please enter a valid ticket ID')
      return
    }

    if (isNaN(priceEth) || priceEth <= 0) {
      setError('Please enter a valid price')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert ETH to wei (1 ETH = 10^18 wei)
      const priceWei = Math.floor(priceEth * Math.pow(10, 18))

      console.log('🔍 Listing ticket:', { ticketId, priceWei })

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
        ticket_id: ticketId,
        price: priceWei
      })
      console.log('✅ List result:', result)

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
        // Reset form
        setFormData({ ticket_id: '', price_eth: '' })
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ticket_id" className="text-right">
                  Ticket ID
                </Label>
                <Input
                  id="ticket_id"
                  type="number"
                  placeholder="Enter ticket ID"
                  className="col-span-3"
                  value={formData.ticket_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, ticket_id: e.target.value }))}
                  disabled={loading}
                  min="0"
                  step="1"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price_eth" className="text-right">
                  Price (ETH)
                </Label>
                <Input
                  id="price_eth"
                  type="number"
                  placeholder="0.1"
                  className="col-span-3"
                  value={formData.price_eth}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_eth: e.target.value }))}
                  disabled={loading}
                  min="0"
                  step="0.001"
                />
              </div>
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
              <Button type="submit" disabled={loading}>
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