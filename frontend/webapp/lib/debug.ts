// Debug utilities for troubleshooting API issues
export async function testApiConnection() {
  console.log('=== API CONNECTION DEBUG TEST ===');
  console.log('Browser location:', window.location.href);
  console.log('Testing API connection...');
  
  // Import API_BASE_URL to see what it resolves to
  try {
    const { API_BASE_URL } = await import('./api/client');
    console.log('API_BASE_URL from client:', API_BASE_URL);
  } catch (importError) {
    console.error('Failed to import API_BASE_URL:', importError);
  }
  
  try {
    // Test basic connection
    console.log('Step 1: Testing basic API health endpoint...');
    try {
      const healthResponse = await fetch('http://localhost:8000/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Health check status:', healthResponse.status);
      console.log('Health check ok:', healthResponse.ok);
      const healthData = await healthResponse.text();
      console.log('Health check response:', healthData);
    } catch (healthError) {
      console.error('Health check failed:', healthError);
      throw new Error(`Health check failed: ${healthError instanceof Error ? healthError.message : String(healthError)}`);
    }
    
    // Test auth login
    console.log('Step 2: Testing authentication...');
    try {
      const loginResponse = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'organiser',
          password: 'password123'
        })
      });
      
      console.log('Login status:', loginResponse.status);
      console.log('Login ok:', loginResponse.ok);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('Login successful, token:', loginData.access_token.substring(0, 20) + '...');
        
        // Test create event endpoint with token
        try {
          console.log('Testing event creation endpoint...');
          const eventResponse = await fetch('http://localhost:8000/events/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.access_token}`,
            },
            body: JSON.stringify({
              name: 'Debug Test Event',
              venue: 'Debug Venue',
              date: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
              price: 1000000000000000000, // 1 ETH in wei
              total_tickets: 10
            })
          });
          
          console.log('Event creation status:', eventResponse.status);
          console.log('Event creation headers:', Object.fromEntries(eventResponse.headers));
          
          if (eventResponse.ok) {
            const eventData = await eventResponse.json();
            console.log('Event creation successful:', eventData);
          } else {
            const eventError = await eventResponse.text().catch(() => 'Unable to read error response');
            console.log('Event creation error response:', eventError);
          }
        } catch (eventFetchError) {
          console.error('Event creation fetch failed:', eventFetchError);
          console.log('Event fetch error details:', {
            message: eventFetchError instanceof Error ? eventFetchError.message : String(eventFetchError),
            stack: eventFetchError instanceof Error ? eventFetchError.stack : undefined,
            name: eventFetchError instanceof Error ? eventFetchError.name : undefined
          });
        }
      } else {
        const loginError = await loginResponse.text().catch(() => 'Unable to read login error');
        console.log('Login error:', loginError);
        }
      } catch (loginFetchError) {
        console.error('Login fetch failed:', loginFetchError);
        console.log('Login fetch error details:', {
          message: loginFetchError instanceof Error ? loginFetchError.message : String(loginFetchError),
          stack: loginFetchError instanceof Error ? loginFetchError.stack : undefined,
          name: loginFetchError instanceof Error ? loginFetchError.name : undefined
        });
      }
      
      // Test using the actual createEvent function from the frontend
      console.log('Step 3: Testing with actual frontend createEvent function...');
      try {
        // Store a test token first
        const testToken = 'test-token-for-debugging';
        localStorage.setItem('token', testToken);
        
        const { createEvent } = await import('./api/events');
        
        const testEventData = {
          name: 'Frontend API Test Event',
          description: 'Test event created via frontend API function',
          venue: 'Test Venue',
          datetime: '2025-12-01T19:00',
          ticket_price: '0.1',
          total_supply: 50
        };
        
        console.log('Testing createEvent with data:', testEventData);
        const result = await createEvent(testEventData);
        console.log('Frontend createEvent successful:', result);
        
      } catch (frontendApiError) {
        console.error('Frontend API createEvent failed:', frontendApiError);
        console.log('Frontend API error details:', {
          message: frontendApiError instanceof Error ? frontendApiError.message : String(frontendApiError),
          stack: frontendApiError instanceof Error ? frontendApiError.stack : undefined,
          name: frontendApiError instanceof Error ? frontendApiError.name : undefined
        });
      }  } catch (error) {
    console.error('Connection test failed:', error);
    
    // Additional debugging info
    console.log('Error type:', typeof error);
    console.log('Error message:', error instanceof Error ? error.message : String(error));
    console.log('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Test if we can access localStorage
export function testLocalStorage() {
  console.log('Testing localStorage...');
  try {
    const token = localStorage.getItem('token');
    console.log('Current token:', token ? token.substring(0, 20) + '...' : 'No token found');
    
    const user = localStorage.getItem('user');
    console.log('Current user:', user);
    
    return { token, user };
  } catch (error) {
    console.error('localStorage access failed:', error);
    return null;
  }
}