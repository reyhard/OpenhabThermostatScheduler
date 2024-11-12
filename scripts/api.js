import openHABConfig from '../config.js';

// Helper function for API requests
async function fetchAPI(endpoint, options = {}) {
  const { apiUrl, token } = openHABConfig;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  if (response.ok && response.headers.get("content-length") === "0") {
        return null; // Return null or handle as appropriate
      }
  // Otherwise, if the response has a body, attempt to parse it as JSON
  return response.json();
}

// API functions
export async function saveRule(ruleData) {
  return fetchAPI("/rules", {
    method: 'POST',
    body: JSON.stringify(ruleData),
  });
}

export async function deleteRule(ruleId) {
  return fetchAPI(`/rules/${ruleId}`, { method: 'DELETE' });
}

export async function getRules() {
  return fetchAPI("/rules", { method: 'GET' });
}
