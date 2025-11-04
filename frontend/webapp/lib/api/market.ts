import { API_BASE_URL } from "./client";

export interface Listing {
  id: string;
  event_id: string;
  event_name: string;
  ticket_id: string;
  seller_address: string;
  price: string;
  status: "active" | "sold" | "cancelled";
}

export interface CreateListingRequest {
  ticket_id: number;
  price: number; // in wei
  seller_account: number;
}

export async function listTicket(data: CreateListingRequest) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch(`${API_BASE_URL}/market/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to list ticket' }));
    throw new Error(error.detail || 'Failed to list ticket');
  }
  
  return response.json();
}

export async function approveMarketplace(userAccount: number) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  const response = await fetch(`${API_BASE_URL}/market/approval/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_account: userAccount
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to approve marketplace' }));
    throw new Error(error.detail || 'Failed to approve marketplace');
  }
  
  return response.json();
}

export async function getListings(): Promise<Listing[]> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/market/listings`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Missing or invalid authorization header');
    }
    throw new Error('Failed to fetch listings');
  }
  
  const data = await response.json();
  
  // Backend returns MarketListingsResponse with listings array
  // Convert backend format to frontend format
  if (data.listings && Array.isArray(data.listings)) {
    return data.listings.map((listing: any) => ({
      id: listing.ticket_id.toString(),
      event_id: listing.event_id.toString(),
      event_name: `Event #${listing.event_id}`, // We don't have event names in backend response
      ticket_id: listing.ticket_id.toString(),
      seller_address: listing.seller_address,
      price: (listing.price / 1e18).toString(), // Convert wei to ETH
      status: listing.is_active ? 'active' : 'sold'
    }));
  }
  
  return []; // Return empty array if no listings
}

export async function createListing(data: CreateListingRequest): Promise<Listing> {
  const response = await fetch(`${API_BASE_URL}/market/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create listing');
  }

  return response.json();
}

export async function buyTicket(listingId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/market/listings/${listingId}/buy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to buy ticket');
  }
}