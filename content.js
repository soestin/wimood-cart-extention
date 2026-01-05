// Content script for Wimood Cart Manager
// This script runs on wimoodshop.nl pages and handles cart API interactions

const API_BASE = 'https://wimoodshop.nl/ajax/cart';

// Listen for messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getCart':
          const cartData = await fetchCurrentCart();
          sendResponse({ success: true, data: cartData });
          break;
          
        case 'loadCart':
          const loadResult = await loadCart(request.products);
          sendResponse(loadResult);
          break;
          
        case 'clearCart':
          const clearResult = await clearCart();
          sendResponse(clearResult);
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Fetch current cart from API
async function fetchCurrentCart() {
  try {
    const response = await fetch(`${API_BASE}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
}

// Load a saved cart by adding all products
async function loadCart(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return { success: false, error: 'No products to load' };
  }
  
  const errors = [];
  const successes = [];
  
  // First, clear the current cart
  try {
    const currentCart = await fetchCurrentCart();
    if (currentCart.products && currentCart.products.length > 0) {
      for (const product of currentCart.products) {
        try {
          await removeProductFromCart(product.productId);
        } catch (error) {
          console.warn(`Failed to remove product ${product.productId}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Error clearing cart before loading:', error);
    // Continue anyway
  }
  
  // Add all products from saved cart
  for (const product of products) {
    try {
      const result = await addProductToCart(product.productId, product.quantity);
      if (result.success) {
        successes.push(product.productId);
      } else {
        errors.push({ productId: product.productId, error: result.error });
      }
    } catch (error) {
      errors.push({ productId: product.productId, error: error.message });
    }
  }
  
  if (errors.length > 0) {
    return {
      success: false,
      error: `Failed to load ${errors.length} product(s). Some products may be out of stock or no longer available.`,
      errors: errors,
      successes: successes
    };
  }
  
  return { success: true, loaded: successes.length };
}

// Add product to cart
async function addProductToCart(productId, quantity) {
  try {
    const response = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({
        productId: productId,
        quantity: quantity
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }
    
    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    console.error(`Error adding product ${productId}:`, error);
    return { success: false, error: error.message };
  }
}

// Update product quantity
async function updateProductQuantity(productId, quantity) {
  try {
    const response = await fetch(`${API_BASE}/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({
        quantity: quantity
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }
    
    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    console.error(`Error updating product ${productId}:`, error);
    throw error;
  }
}

// Remove product from cart using DELETE method
async function removeProductFromCart(productId) {
  try {
    const response = await fetch(`${API_BASE}/${productId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }
    
    const data = await response.json();
    return { success: true, data: data };
  } catch (error) {
    console.error(`Error removing product ${productId}:`, error);
    throw error;
  }
}

// Clear the entire cart
async function clearCart() {
  try {
    const currentCart = await fetchCurrentCart();
    
    if (!currentCart.products || currentCart.products.length === 0) {
      return { success: true, message: 'Cart is already empty' };
    }
    
    const errors = [];
    
    // Remove each product using DELETE method
    for (const product of currentCart.products) {
      try {
        await removeProductFromCart(product.productId);
      } catch (error) {
        console.error(`Error removing product ${product.productId}:`, error);
        errors.push({ productId: product.productId, error: error.message });
      }
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        error: `Failed to remove ${errors.length} product(s)`,
        errors: errors
      };
    }
    
    return { success: true, cleared: currentCart.products.length };
  } catch (error) {
    console.error('Error clearing cart:', error);
    return { success: false, error: error.message };
  }
}
