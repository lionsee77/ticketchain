"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { buyTickets, type Event } from "@/lib/api/events"
import { getUserProfile } from "@/lib/api/client"

const formSchema = z.object({
  quantity: z.string().min(1, {
    message: "Quantity is required.",
  }).refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Quantity must be a positive number.",
  }),
})

interface BuyTicketsDialogProps {
  event: Event
  onTicketsPurchased?: () => void
}

export function BuyTicketsDialog({ event, onTicketsPurchased }: BuyTicketsDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [userAccountIndex, setUserAccountIndex] = React.useState<number | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: "1",
    },
  })

  // Get user account index when dialog opens
  React.useEffect(() => {
    if (open && userAccountIndex === null) {
      getUserProfile()
        .then(() => {
          setUserAccountIndex(0) // Set default since we no longer use account index
        })
        .catch(err => {
          console.error('Failed to get user profile:', err)
          setError('Failed to get user account information')
        })
    }
  }, [open, userAccountIndex])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      if (userAccountIndex === null) {
        throw new Error('User account information not available')
      }

      console.log("Buying tickets for event:", event.id)
      console.log("Form data:", values)
      console.log("Using user account index:", userAccountIndex)

      const result = await buyTickets({
        event_id: Number(event.id),
        quantity: Number(values.quantity),
        user_account: userAccountIndex,
      })

      const shortTxHash = result.tx_hash.substring(0, 8) + '...'
      setSuccess(`${values.quantity} ticket${Number(values.quantity) > 1 ? 's' : ''} purchased! Tx: ${shortTxHash}`)
      form.reset()

      // Call the callback to refresh data
      if (onTicketsPurchased) {
        await onTicketsPurchased()
      }

      // Auto-close dialog after 3 seconds on success
      setTimeout(() => {
        setOpen(false)
        setSuccess(null)
      }, 3000)

    } catch (err) {
      console.error("Buy tickets error:", err)
      setError(err instanceof Error ? err.message : "Failed to buy tickets")
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate total price
  const quantity = Number(form.watch("quantity")) || 1
  const totalPrice = (parseFloat(event.ticket_price) * quantity).toFixed(4)

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
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
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
                {userAccountIndex !== null && (
                  <p><strong>Your account:</strong> #{userAccountIndex}</p>
                )}
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

            <div className="p-3 bg-gray-50 rounded-md">
              <p className="font-medium">Total: {totalPrice} ETH</p>
              <p className="text-sm text-gray-600">
                {quantity} ticket(s) × {event.ticket_price} ETH each
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading || userAccountIndex === null || Number(form.watch("quantity")) > event.available_tickets}
              className="w-full"
            >
              {userAccountIndex === null ? "Loading account..." :
                isLoading ? "Processing..." :
                  `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}