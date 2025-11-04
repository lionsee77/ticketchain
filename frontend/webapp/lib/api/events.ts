import { API_BASE_URL } from './client';

export interface Event {
  id: string;
  name: string;
  description: string;
  venue: string;
  datetime: string;
  ticket_price: string;
  total_supply: number;
  available_tickets: number;
  owner_wallet_address: string;
}

export interface CreateEventRequest {
  name: string;
  description: string;
  venue: string;
  datetime: string;
  ticket_price: string;
  total_supply: number;
}

// Backend expects different format
interface BackendCreateEventRequest {
  name: string;
  venue: string;
  date: number; // Unix timestamp
  price: number; // Price in wei
  total_tickets: number;
}

export async function getEvents(): Promise<Event[]> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/events/all`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Missing or invalid authorization header');
    }
    throw new Error('Failed to fetch events');
  }
  
  const backendEvents = await response.json();
  
  // Convert backend format to frontend format
  return backendEvents.map((event: any) => ({
    id: event.id.toString(),
    name: event.name,
    description: '', // Backend doesn't provide description
    venue: event.venue,
    datetime: new Date(event.date * 1000).toISOString(), // Convert Unix timestamp to ISO string
    ticket_price: (event.ticketPrice / 1e18).toString(), // Convert wei to ETH
    total_supply: event.totalTickets,
    available_tickets: event.totalTickets - event.ticketsSold,
    owner_wallet_address: event.organiser,
  }));
}

export async function createEvent(data: CreateEventRequest): Promise<Event> {
  // Convert frontend format to backend format
  const backendData: BackendCreateEventRequest = {
    name: data.name,
    venue: data.venue,
    date: Math.floor(new Date(data.datetime).getTime() / 1000), // Convert to Unix timestamp
    price: Math.floor(parseFloat(data.ticket_price) * 1e18), // Convert ETH to wei
    total_tickets: data.total_supply,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/events/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(backendData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new Error(error.detail || 'Failed to create event');
    }

    const result = await response.json();
    
    // Convert backend response to frontend Event format
    // Since backend returns transaction info, we'll need to fetch the created event
    // For now, return a mock event that matches the interface
    return {
      id: 'pending', // Will be set after blockchain confirmation
      name: data.name,
      description: data.description,
      venue: data.venue,
      datetime: data.datetime,
      ticket_price: data.ticket_price,
      total_supply: data.total_supply,
      available_tickets: data.total_supply,
      owner_wallet_address: 'pending',
    };
  } catch (error) {
    throw error;
  }
}

export async function getEvent(id: string): Promise<Event> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/events/${id}/details`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Missing or invalid authorization header');
    }
    throw new Error('Failed to fetch event');
  }
  
  const backendEvent = await response.json();
  
  // Convert backend format to frontend format
  return {
    id: backendEvent.event_id.toString(),
    name: backendEvent.name,
    description: '', // Backend doesn't provide description
    venue: backendEvent.venue,
    datetime: new Date(backendEvent.date * 1000).toISOString(), // Convert Unix timestamp to ISO string
    ticket_price: backendEvent.ticket_price_eth.toString(), // Already in ETH
    total_supply: backendEvent.total_tickets,
    available_tickets: backendEvent.tickets_available,
    owner_wallet_address: backendEvent.organiser,
  };
}

export interface BuyTicketsRequest {
  event_id: number;
  quantity: number;
  user_account: number; // Hardhat test account index (0-19)
}

export async function buyTickets(data: BuyTicketsRequest) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  console.log('Buying tickets:', data);
  
  const response = await fetch(`${API_BASE_URL}/events/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  console.log('Buy tickets response status:', response.status);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to buy tickets' }));
    console.error('Buy tickets error:', error);
    throw new Error(error.detail || 'Failed to buy tickets');
  }
  
  const result = await response.json();
  console.log('Buy tickets successful:', result);
  return result;
}