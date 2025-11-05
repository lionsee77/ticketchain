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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  }
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

export async function getUserProfile(): Promise<UserProfile> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error('Failed to fetch user profile');
  }

  return response.json();
}

export const apiClient = new ApiClient();