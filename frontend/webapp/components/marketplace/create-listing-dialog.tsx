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
import type { Event } from "@/lib/api/events"
import { createListing } from "@/lib/api/market"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  price: z.string().regex(/^\d+(\.\d{1,18})?$/, {
    message: "Please enter a valid price in ETH.",
  }),
  ticket_id: z.string().min(1, {
    message: "Please enter a ticket ID.",
  }),
})

interface CreateListingDialogProps {
  event: Event
}

export function CreateListingDialog({ event }: CreateListingDialogProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: "",
      ticket_id: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      await createListing({
        event_id: event.id,
        ...values,
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">List Ticket</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>List Ticket for {event.name}</DialogTitle>
          <DialogDescription>
            Enter your ticket details to list it on the marketplace.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ticket_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your ticket ID" {...field} />
                  </FormControl>
                  <FormDescription>
                    The ID of the ticket you want to sell
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (ETH)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.000000000000000001"
                      placeholder="Enter listing price"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The price in ETH for your ticket
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Listing"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}