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
import { apiClient, type LoyaltyBalance } from "@/lib/api/client"
import { Clock, Users, AlertTriangle } from "lucide-react"

const formSchema = z.object({
  useLoyaltyPoints: z.boolean(),
  pointsAmount: z.string().optional(),
})

interface JoinQueueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: number
  eventName: string
  userAddress: string
  onQueueJoined?: () => void
}

export function JoinQueueDialog({ 
  open, 
  onOpenChange, 
  eventId, 
  eventName, 
  userAddress,
  onQueueJoined 
}: JoinQueueDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loyaltyBalance, setLoyaltyBalance] = React.useState<LoyaltyBalance | null>(null)
  const [loadingBalance, setLoadingBalance] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      useLoyaltyPoints: false,
      pointsAmount: "0",
    },
  })

  const useLoyaltyPoints = form.watch("useLoyaltyPoints")

  // Fetch loyalty balance when dialog opens
  React.useEffect(() => {
    const fetchLoyaltyBalance = async () => {
      try {
        setLoadingBalance(true)
        const balance = await apiClient.getLoyaltyBalance()
        setLoyaltyBalance(balance)
      } catch (err) {
        console.error("Failed to fetch loyalty balance:", err)
        setLoyaltyBalance(null)
      } finally {
        setLoadingBalance(false)
      }
    }

    if (open) {
      fetchLoyaltyBalance()
    }
  }, [open])

  // Auto-set points amount when loyalty checkbox is checked
  React.useEffect(() => {
    if (useLoyaltyPoints && loyaltyBalance) {
      // Convert wei to display format (divide by 1e18)
      const pointsInDisplayFormat = Number(BigInt(loyaltyBalance.balance) / BigInt(1e18))
      form.setValue("pointsAmount", pointsInDisplayFormat.toString())
    } else {
      form.setValue("pointsAmount", "0")
    }
  }, [useLoyaltyPoints, loyaltyBalance, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)

      const pointsAmount = values.useLoyaltyPoints ? Number(values.pointsAmount) || 0 : 0

      await apiClient.joinQueue({
        user_address: userAddress,
        points_amount: pointsAmount,
      })

      // Call the callback to refresh queue status
      if (onQueueJoined) {
        await onQueueJoined()
      }

      // Close dialog
      onOpenChange(false)
      form.reset()

    } catch (err) {
      console.error("Join queue error:", err)
      setError(err instanceof Error ? err.message : "Failed to join queue")
    } finally {
      setIsLoading(false)
    }
  }

  const availablePoints = loyaltyBalance 
    ? Number(BigInt(loyaltyBalance.balance) / BigInt(1e18))
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Join Queue
          </DialogTitle>
          <DialogDescription>
            Join the queue for {eventName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">How the queue works</span>
            </div>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Only 2 users can buy tickets at a time</li>
              <li>• You'll be notified when it's your turn</li>
              <li>• Use loyalty points for better queue position</li>
              <li>• You can leave the queue anytime</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="useLoyaltyPoints"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loadingBalance || availablePoints === 0}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Use Loyalty Points for Priority
                      </FormLabel>
                      <FormDescription>
                        {loadingBalance ? (
                          "Loading balance..."
                        ) : availablePoints > 0 ? (
                          `You have ${availablePoints} loyalty points available. Higher points = better queue position!`
                        ) : (
                          "You don't have any loyalty points to use for priority."
                        )}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {useLoyaltyPoints && availablePoints > 0 && (
                <FormField
                  control={form.control}
                  name="pointsAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points to Use</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max={availablePoints}
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum: {availablePoints} points
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Queue"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}