// API URL configuration for different contexts
const getApiBaseUrl = () => {
  // If we're on the client side (browser), always use localhost
  if (typeof window !== 'undefined') {
    return 'http://localhost:8000';
  }
  
  // If we're on the server side, use the environment variable or localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug API connectivity
if (typeof window !== 'undefined') {
  console.log('API_BASE_URL initialized (client-side):', API_BASE_URL);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}

// ========== Type Definitions ==========

// Auth Types
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  wallet_address: string;
  private_key: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  roles: string[];
  wallet_address: string;
  private_key: string;
}

// Event Types
export interface Event {
  id: number;
  name: string;
  venue: string;
  date: number; // Unix timestamp
  ticketPrice: string; // in wei
  totalTickets: number;
  ticketsSold: number;
  isActive: boolean;
  organizer: string;
}

export interface EventDetails extends Event {
  description?: string;
  category?: string;
}

export interface CreateEventRequest {
  name: string;
  venue: string;
  date: number; // Unix timestamp
  price: number; // in wei
  total_tickets: number;
}

export interface BuyTicketRequest {
  event_id: number;
  quantity: number;
  use_loyalty_points: boolean;
}

// Ticket Types
export interface Ticket {
  ticket_id: number;
  event_id: number;
  event_name: string;
  event_location: string;
  event_date: string;
  ticket_price: string; // in wei
  is_used: boolean;
  owner_address: string;
}

export interface TicketDetails extends Ticket {
  event_venue?: string;
  purchase_date?: string;
}

// Marketplace Types
export interface MarketListing {
  listing_id?: number; // Optional - in this system, listings are identified by ticket_id
  ticket_id: number;
  event_id: number;
  event_name?: string; // May not be available from backend
  seller_address: string;
  price: string; // in wei
  is_active: boolean;
  listed_at?: string;
}

export interface ListTicketRequest {
  ticket_id: number;
  price: number; // in wei
}

export interface BuyListedTicketRequest {
  ticket_id: number;
}

// Loyalty Types
export interface LoyaltyBalance {
  success: boolean;
  address: string;
  balance: string; // Balance as string in wei (with 18 decimals)
  decimals: number;
  message: string;
}

export interface LoyaltyPreview {
  original_price: string;
  discount: string;
  final_price: string;
  points_to_redeem: number;
}

// Queue Types
export interface QueueStatus {
  user_address: string;
  queue_position: number;
  can_purchase: number; // 1 if can purchase, 0 if not
}

export interface QueueStats {
  queue_size: number;
  active_buyers: number;
  available_slots: number;
}

export interface JoinQueueRequest {
  user_address: string;
  points_amount: number;
  user_account_index?: number;
}

export interface JoinQueueResponse {
  success: boolean;
  user_address: string;
  queue_position: number;
  points_redeemed: number;
  can_purchase: number;
}

// ========== API Client Class ==========

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      // Handle various error response formats
      const errorMessage = error.detail || error.message || error.error || JSON.stringify(error);
      throw new Error(typeof errorMessage === 'string' ? errorMessage : `Request failed with status ${response.status}`);
    }
    return response.json();
  }

  // ========== Authentication Endpoints ==========

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<AuthResponse>(response);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<AuthResponse>(response);
  }

  async logout(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getProfile(): Promise<UserProfile> {
    const response = await fetch(`${this.baseUrl}/auth/profile`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<UserProfile>(response);
  }

  async refreshToken(): Promise<{ access_token: string }> {
    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // ========== Event Endpoints ==========

  async getAllEvents(): Promise<{ events: Event[] }> {
    const response = await fetch(`${this.baseUrl}/events/all`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getEventDetails(eventId: number): Promise<EventDetails> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/details`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createEvent(data: CreateEventRequest): Promise<{ event_id: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/events/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async closeEvent(eventId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/events/${eventId}/close`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async buyTicket(data: BuyTicketRequest): Promise<{ 
    success: boolean;
    message: string; 
    ticket_ids?: number[];
    loyalty_points_awarded?: number;
    total_price_eth?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/events/buy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // ========== Ticket Endpoints ==========

  async getMyTickets(): Promise<{ tickets: Ticket[] }> {
    const response = await fetch(`${this.baseUrl}/tickets/owned`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTicketDetails(ticketId: number): Promise<TicketDetails> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async checkTicketUsed(ticketId: number): Promise<{ is_used: boolean }> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/check-used`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async markTicketAsUsed(ticketId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/tickets/${ticketId}/mark-used`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // ========== Marketplace Endpoints ==========

  async getMarketListings(): Promise<{ listings: MarketListing[] }> {
    const response = await fetch(`${this.baseUrl}/market/listings`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMyListings(): Promise<{ listings: MarketListing[] }> {
    const response = await fetch(`${this.baseUrl}/market/my-listings`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async listTicket(data: ListTicketRequest): Promise<{ listing_id: number; message: string }> {
    const response = await fetch(`${this.baseUrl}/market/list`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delistTicket(listingId: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/market/delist`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ listing_id: listingId }),
    });
    return this.handleResponse(response);
  }

  async buyListedTicket(data: BuyListedTicketRequest): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/market/buy`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async checkMarketApprovalStatus(): Promise<{ is_approved: boolean }> {
    const response = await fetch(`${this.baseUrl}/market/approval/status`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async approveMarket(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/market/approval/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({}), // Send empty JSON object
    });
    return this.handleResponse(response);
  }

  // ========== Loyalty Endpoints ==========

  async getLoyaltyBalance(): Promise<LoyaltyBalance> {
    const response = await fetch(`${this.baseUrl}/loyalty/balance`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getLoyaltyPreview(ticketWei: string): Promise<{
    success: boolean;
    address: string;
    ticket_wei: string;
    points_applicable: string;
    wei_discount: string;
    wei_due: string;
    discount_percentage: number;
    message: string;
    points_to_redeem?: number;
  }> {
    const response = await fetch(`${this.baseUrl}/loyalty/preview?ticket_wei=${ticketWei}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async previewLoyaltyDiscount(price: number, points: number): Promise<LoyaltyPreview> {
    const response = await fetch(`${this.baseUrl}/loyalty/preview?price=${price}&points=${points}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async approveLoyaltySystem(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/loyalty/approval/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async checkLoyaltyApprovalStatus(): Promise<{ is_approved: boolean }> {
    const response = await fetch(`${this.baseUrl}/loyalty/approval/status`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async redeemLoyaltyPoints(ticketId: number, points: number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/loyalty/redeem`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ ticket_id: ticketId, points }),
    });
    return this.handleResponse(response);
  }

  // ========== Queue Endpoints ==========

  async joinQueue(data: JoinQueueRequest): Promise<JoinQueueResponse> {
    const response = await fetch(`${this.baseUrl}/queue/join`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getQueuePosition(userAddress: string): Promise<QueueStatus> {
    const response = await fetch(`${this.baseUrl}/queue/position/${userAddress}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async canPurchase(userAddress: string): Promise<{ user_address: string; can_purchase: number }> {
    const response = await fetch(`${this.baseUrl}/queue/can-purchase/${userAddress}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async leaveQueue(userAddress: string): Promise<{ status: string; user_address: string; was_in_queue: boolean }> {
    const response = await fetch(`${this.baseUrl}/queue/leave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ user_address: userAddress }),
    });
    return this.handleResponse(response);
  }

  async getQueueStats(): Promise<QueueStats> {
    const response = await fetch(`${this.baseUrl}/queue/stats`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async completeQueuePurchase(userAddress: string): Promise<{ status: string; user_address: string }> {
    const response = await fetch(`${this.baseUrl}/queue/complete/${userAddress}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient();