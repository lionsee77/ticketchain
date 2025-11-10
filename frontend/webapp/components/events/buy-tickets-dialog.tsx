"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { type Event } from "@/lib/api/events"
import { apiClient } from "@/lib/api/client"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  quantity: z.string().min(1, {
    message: "Quantity is required.",
  }).refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number.",
  }),
  useLoyaltyPoints: z.boolean(),
})

interface LoyaltyPreview {
  points_applicable: number
  wei_discount: string
  wei_due: string
  points_to_redeem: number
}

interface BuyTicketsDialogProps {
  event: Event
  onTicketsPurchased?: () => void
}

export function BuyTicketsDialog({ event, onTicketsPurchased }: BuyTicketsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [loyaltyPointsAwarded, setLoyaltyPointsAwarded] = React.useState<number>(0)
  const [loyaltyPreview, setLoyaltyPreview] = React.useState<LoyaltyPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: "1",
      useLoyaltyPoints: false,
    },
  })

  // Watch for changes to fetch loyalty preview
  const useLoyaltyPoints = form.watch("useLoyaltyPoints")
  const quantity = Number(form.watch("quantity")) || 1

  // Fetch loyalty preview when loyalty checkbox is checked
  React.useEffect(() => {
    const fetchLoyaltyPreview = async () => {
      try {
        setLoadingPreview(true)
        // Convert ETH price to wei
        const pricePerTicketWei = BigInt(Math.floor(parseFloat(event.ticket_price) * 1e18))
        const totalWei = pricePerTicketWei * BigInt(quantity)
        
        const preview = await apiClient.getLoyaltyPreview(totalWei.toString())
        
        // Convert loyalty points from wei format (18 decimals) to regular number
        const pointsApplicableWei = BigInt(preview.points_applicable)
        const pointsApplicableFormatted = Number(pointsApplicableWei / BigInt(1e18))
        
        setLoyaltyPreview({
          points_applicable: pointsApplicableFormatted,
          wei_discount: preview.wei_discount,
          wei_due: preview.wei_due,
          points_to_redeem: pointsApplicableFormatted,
        })
      } catch (err) {
        console.error("Failed to fetch loyalty preview:", err)
        setLoyaltyPreview(null)
      } finally {
        setLoadingPreview(false)
      }
    }

    if (useLoyaltyPoints && quantity > 0) {
      fetchLoyaltyPreview()
    } else {
      setLoyaltyPreview(null)
    }
  }, [useLoyaltyPoints, quantity, event.ticket_price])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)
      setLoyaltyPointsAwarded(0)

      console.log("Buying tickets for event:", event.id)
      console.log("Form data:", values)

      const result = await apiClient.buyTicket({
        event_id: Number(event.id),
        quantity: Number(values.quantity),
        use_loyalty_points: values.useLoyaltyPoints,
      })

      // Show success with loyalty points
      const pointsMsg = result.loyalty_points_awarded 
        ? ` 🎉 Earned ${result.loyalty_points_awarded} loyalty points!` 
        : ''
      
      setLoyaltyPointsAwarded(result.loyalty_points_awarded || 0)
      setSuccess(`${values.quantity} ticket${Number(values.quantity) > 1 ? 's' : ''} purchased!${pointsMsg}`)
      form.reset()

      // Call the callback to refresh data
      if (onTicketsPurchased) {
        await onTicketsPurchased()
      }

      // Auto-close dialog after 4 seconds on success
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
        setLoyaltyPointsAwarded(0)
        setLoyaltyPreview(null)
      }, 4000)

    } catch (err) {
      console.error("Buy tickets error:", err)
      setError(err instanceof Error ? err.message : "Failed to buy tickets")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate total price
  const totalPriceEth = parseFloat(event.ticket_price) * quantity
  const totalPriceDisplay = totalPriceEth.toFixed(4)
  
  // Calculate final price with loyalty discount
  const finalPriceEth = loyaltyPreview 
    ? Number(BigInt(loyaltyPreview.wei_due) / BigInt(1e14)) / 10000 // Convert wei to ETH
    : totalPriceEth
  const discountEth = loyaltyPreview
    ? Number(BigInt(loyaltyPreview.wei_discount) / BigInt(1e14)) / 10000
    : 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors"
        >
          Get Tickets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buy Tickets</DialogTitle>
          <DialogDescription>
            Purchase tickets for {event.name}
          </DialogDescription>
        </DialogHeader>

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs break-all overflow-hidden max-w-full">
            <div className="font-medium mb-1">✅ Purchase Successful!</div>
            <div className="opacity-80">{success}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs break-all overflow-hidden max-w-full">
            <div className="font-medium mb-1">❌ Error</div>
            <div className="opacity-80">{error}</div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Event Details</h3>
              <div className="text-sm text-gray-600">
                <p><strong>Event:</strong> {event.name}</p>
                <p><strong>Venue:</strong> {event.venue}</p>
                <p><strong>Date:</strong> {new Date(event.datetime).toLocaleDateString()}</p>
                <p><strong>Price per ticket:</strong> {event.ticket_price} ETH</p>
                <p><strong>Available:</strong> {event.available_tickets} tickets</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Tickets</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max={event.available_tickets}
                      placeholder="1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="useLoyaltyPoints"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Use Loyalty Points for Discount
                    </FormLabel>
                    <FormDescription>
                      Redeem your loyalty points for up to 30% off
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {loadingPreview && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            )}

            {loyaltyPreview && !loadingPreview && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-md space-y-2">
                <p className="text-sm font-semibold text-amber-900">
                  🎁 Loyalty Discount Applied!
                </p>
                <div className="text-xs text-amber-800 space-y-1">
                  <p>Points to redeem: <strong>{loyaltyPreview.points_to_redeem}</strong></p>
                  <p>Discount: <strong className="text-green-600">-{discountEth.toFixed(4)} ETH</strong></p>
                  <p>You pay: <strong>{finalPriceEth.toFixed(4)} ETH</strong></p>
                </div>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">
                {loyaltyPreview ? 'Original' : 'Total'}: {totalPriceDisplay} ETH
              </p>
              <p className="text-sm text-gray-600">
                {quantity} ticket(s) × {event.ticket_price} ETH each
              </p>
              {loyaltyPreview && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="font-bold text-lg text-green-600">
                    Final Price: {finalPriceEth.toFixed(4)} ETH
                  </p>
                  <p className="text-xs text-gray-600">
                    Saved {discountEth.toFixed(4)} ETH with loyalty points!
                  </p>
                </div>
              )}
            </div>

            {loyaltyPointsAwarded > 0 && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  🎉 You earned {loyaltyPointsAwarded} loyalty points!
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || Number(form.watch("quantity")) > event.available_tickets}
              className="w-full"
            >
              {isLoading ? "Processing..." : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}