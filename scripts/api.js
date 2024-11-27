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

  // Handle response based on Content-Type
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    return response.json(); // Parse JSON response
  } else if (contentType.includes('text/plain')) {
    return response.text(); // Parse text response
  } else {
    throw new Error(`Unsupported content type: ${contentType}`);
  }
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

export async function getItemState(itemName) {
  try {
    const state = await fetchAPI(`/items/${itemName}/state`, {
      method: 'GET',
    });
    return state;
  } catch (error) {
    console.error(`Error getting state for item ${itemName}:`, error);
    throw error;
  }
}

export async function updateItemState(itemName, newState) {
  try {
    await fetchAPI(`/items/${itemName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Override default JSON content type
      body: newState, // Send the new state as plain text
    });
    console.log(`State for item ${itemName} updated successfully!`);
  } catch (error) {
    console.error(`Error updating state for item ${itemName}:`, error);
    throw error;
  }
}
