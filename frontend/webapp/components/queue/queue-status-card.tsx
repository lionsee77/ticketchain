"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient, type QueueStatus } from "@/lib/api/client"
import { Clock, Users, Trophy, X } from "lucide-react"

interface QueueStatusCardProps {
  userAddress: string
  eventName: string
  onLeaveQueue?: () => void
  onCanPurchase?: () => void
}

export function QueueStatusCard({ 
  userAddress, 
  eventName, 
  onLeaveQueue, 
  onCanPurchase 
}: QueueStatusCardProps) {
  const [queueStatus, setQueueStatus] = React.useState<QueueStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Poll queue status every 30 seconds
  const fetchQueueStatus = React.useCallback(async () => {
    try {
      setError(null)
      const status = await apiClient.getQueuePosition(userAddress)
      setQueueStatus(status)
      
      // If user can purchase, notify parent
      if (status.can_purchase === 1 && onCanPurchase) {
        onCanPurchase()
      }
    } catch (err) {
      console.error("Failed to fetch queue status:", err)
      setError(err instanceof Error ? err.message : "Failed to check queue status")
    }
  }, [userAddress, onCanPurchase])

  // Initial fetch and set up polling
  React.useEffect(() => {
    fetchQueueStatus()
    const interval = setInterval(fetchQueueStatus, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [fetchQueueStatus])

  const handleLeaveQueue = async () => {
    try {
      setIsLoading(true)
      await apiClient.leaveQueue(userAddress)
      
      if (onLeaveQueue) {
        onLeaveQueue()
      }
    } catch (err) {
      console.error("Failed to leave queue:", err)
      setError(err instanceof Error ? err.message : "Failed to leave queue")
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <X className="h-4 w-4" />
              <span className="text-sm font-medium">Queue Error</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchQueueStatus}
              className="text-red-700 border-red-300"
            >
              Retry
            </Button>
          </div>
          <p className="text-sm text-red-600 mt-2">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!queueStatus) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking queue status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canPurchase = queueStatus.can_purchase === 1
  const position = queueStatus.queue_position

  return (
    <Card className={`border-2 ${canPurchase ? 'border-green-300 bg-green-50' : 'border-blue-300 bg-blue-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg flex items-center gap-2 ${canPurchase ? 'text-green-800' : 'text-blue-800'}`}>
          {canPurchase ? (
            <>
              <Trophy className="h-5 w-5" />
              Your Turn!
            </>
          ) : (
            <>
              <Users className="h-5 w-5" />
              In Queue
            </>
          )}
        </CardTitle>
        <CardDescription className={canPurchase ? 'text-green-700' : 'text-blue-700'}>
          {eventName}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {canPurchase ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-100 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium text-sm">
                🎉 You can now purchase tickets!
              </p>
              <p className="text-green-700 text-xs mt-1">
                Click the &quot;Buy Tickets&quot; button to complete your purchase
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Queue Position</span>
              <span className="text-lg font-bold text-blue-900">#{position}</span>
            </div>
            
            <div className="p-3 bg-blue-100 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <Clock className="h-4 w-4" />
                <span>Please wait for your turn</span>
              </div>
              <p className="text-blue-700 text-xs mt-1">
                We&apos;ll update your status automatically
              </p>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueueStatus}
            className={`flex-1 ${canPurchase ? 'border-green-300 text-green-700 hover:bg-green-100' : 'border-blue-300 text-blue-700 hover:bg-blue-100'}`}
          >
            Refresh Status
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeaveQueue}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? "Leaving..." : "Leave Queue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}