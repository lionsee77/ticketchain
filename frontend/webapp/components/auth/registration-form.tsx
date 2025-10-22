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
import { AVAILABLE_HARDHAT_ACCOUNTS, AVAILABLE_HARDHAT_PRIVATE_KEYS } from "@/lib/hardhat-accounts"
import { apiClient } from "@/lib/api/client"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/useAuth"

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
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
  const { login } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      walletAddress: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true)
      setError(null)
      
      // Find the wallet address index in the available accounts
      const accountIndex = AVAILABLE_HARDHAT_ACCOUNTS.indexOf(values.walletAddress)
      if (accountIndex === -1) {
        throw new Error("Invalid wallet address selected")
      }
      
      // Get the corresponding private key (add 2 because we start from account 2)
      const actualAccountIndex = accountIndex + 2
      const privateKey = AVAILABLE_HARDHAT_PRIVATE_KEYS[accountIndex]
      
      // Register the user
      await apiClient.register({
        username: values.username,
        email: values.email,
        password: values.password,
        wallet_address: values.walletAddress,
        account_index: actualAccountIndex,
        private_key: privateKey,
      })
      
      // Auto-login after successful registration
      const loginResponse = await apiClient.login({
        username: values.username,
        password: values.password,
      })
      
      // Use the auth hook to handle login
      login(loginResponse.access_token, { username: values.username })
      
      // Redirect to events page
      router.push("/events")
    } catch (err) {
      console.error('Registration error:', err)
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
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
                  {AVAILABLE_HARDHAT_ACCOUNTS.map((address: string, index: number) => (
                    <SelectItem key={address} value={address}>
                      <div className="flex flex-col">
                        <span>Account {index + 3}</span>
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