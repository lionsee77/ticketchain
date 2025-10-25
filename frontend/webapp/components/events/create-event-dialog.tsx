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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createEvent } from "@/lib/api/events"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Event name must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  venue: z.string().min(3, {
    message: "Venue must be at least 3 characters.",
  }),
  datetime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, {
    message: "Please enter a valid date and time.",
  }),
  ticket_price: z.string().regex(/^\d+(\.\d{1,18})?$/, {
    message: "Please enter a valid price in ETH.",
  }),
  total_supply: z.string().min(1, {
    message: "Total supply is required.",
  }).refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Total supply must be a positive number.",
  }),
})

interface CreateEventDialogProps {
  onEventCreated?: () => void | Promise<void>;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      venue: "",
      datetime: "",
      ticket_price: "",
      total_supply: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      
      await createEvent({
        ...values,
        total_supply: Number(values.total_supply),
      })
      setOpen(false)
      form.reset() // Reset the form after successful creation
      
      // Call the callback to refresh the events list
      if (onEventCreated) {
        await onEventCreated()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Event</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Create a new event and mint tickets as NFTs.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event venue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticket_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Price (ETH)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.000000000000000001" {...field} />
                  </FormControl>
                  <FormDescription>Price in ETH</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_supply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Supply</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormDescription>Total number of tickets available</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}