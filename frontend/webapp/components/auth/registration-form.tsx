"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HARDHAT_ACCOUNTS } from "@/lib/hardhat-accounts"
import { apiClient } from "@/lib/api/client"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  walletAddress: z.string().min(1, {
    message: "Please select a wallet address.",
  }),
})

export function RegistrationForm() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      walletAddress: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      
      // Register the user
      await apiClient.register({
        username: values.username,
        password: values.password,
        wallet_address: values.walletAddress,
      })
      
      // Auto-login after successful registration
      const loginResponse = await apiClient.login({
        username: values.username,
        password: values.password,
      })
      
      // Store the token and user info
      localStorage.setItem('token', loginResponse.access_token)
      localStorage.setItem('user', JSON.stringify({ 
        username: values.username,
        wallet_address: values.walletAddress
      }))
      
      // Redirect to events page
      router.push("/events")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Choose a username" 
                  className="h-11"
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="Create a secure password" 
                  className="h-11"
                  disabled={isLoading}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="walletAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wallet Address</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a wallet address" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {HARDHAT_ACCOUNTS.map((address, index) => (
                    <SelectItem key={address} value={address}>
                      <div className="flex flex-col">
                        <span>Account {index + 1}</span>
                        <span className="text-xs text-gray-500 truncate">
                          {address.slice(0, 10)}...{address.slice(-8)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs">
                Select a test wallet address for development
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          type="submit" 
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
          disabled={isLoading}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>
    </Form>
  )
}