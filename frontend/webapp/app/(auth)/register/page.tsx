"use client"

import { useState } from "react"
import { RegistrationForm } from "@/components/auth/registration-form"
import { LoginForm } from "@/components/auth/login-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, Shield, Users, Zap } from "lucide-react"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen max-w-6xl mx-auto">
          {/* Left side - Branding */}
          <div className="space-y-8 flex flex-col justify-center">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Ticket className="h-10 w-10 text-blue-600" />
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  TicketChain
                </h1>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed">
                Join the future of event ticketing with blockchain-powered security and authenticity
              </p>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">100% Secure</h3>
                  <p className="text-gray-600">Blockchain technology ensures authentic tickets and prevents fraud</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Instant Transfer</h3>
                  <p className="text-gray-600">Transfer tickets instantly to friends or sell on our marketplace</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Community Driven</h3>
                  <p className="text-gray-600">Join millions of users buying and selling authentic event tickets</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
              <p className="text-sm text-gray-600 mb-2">Trusted by</p>
              <div className="flex items-center gap-6 text-gray-500 text-sm font-medium">
                <span>10M+ Users</span>
                <span>•</span>
                <span>50K+ Events</span>
                <span>•</span>
                <span>100% Verified</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth Forms */}
          <div className="w-full max-w-md mx-auto flex flex-col justify-center">
            <Card className="shadow-2xl border-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {isLogin ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <p className="text-gray-600">
                  {isLogin ? 
                    "Sign in to access your tickets and events" : 
                    "Join TicketChain and start exploring events"
                  }
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {isLogin ? <LoginForm /> : <RegistrationForm />}
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      {isLogin ? "New to TicketChain?" : "Already have an account?"}
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => setIsLogin(!isLogin)}
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  {isLogin ? "Create a new account" : "Sign in instead"}
                </Button>
              </CardContent>
            </Card>
            
            <p className="text-center text-xs text-gray-500 mt-6">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}