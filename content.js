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
          
        case 'togglePriceDivs':
          const toggleResult = togglePriceDivs(request.hide);
          sendResponse(toggleResult);
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

// Toggle visibility of price divs
function togglePriceDivs(hide) {
  try {
    const priceDivs = document.querySelectorAll('.product-detail__price');
    
    if (priceDivs.length === 0) {
      return { success: false, error: 'No price divs found on the page' };
    }
    
    priceDivs.forEach(div => {
      if (hide) {
        div.style.display = 'none';
      } else {
        div.style.display = '';
      }
    });
    
    // Also handle dynamically added elements using MutationObserver
    if (hide && !window.priceDivObserver) {
      window.priceDivObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Check if the added node is a price div
              if (node.classList && node.classList.contains('product-detail__price')) {
                node.style.display = 'none';
              }
              // Check for price divs within the added node
              const nestedPriceDivs = node.querySelectorAll && node.querySelectorAll('.product-detail__price');
              if (nestedPriceDivs) {
                nestedPriceDivs.forEach(div => {
                  div.style.display = 'none';
                });
              }
            }
          });
        });
      });
      
      window.priceDivObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else if (!hide && window.priceDivObserver) {
      window.priceDivObserver.disconnect();
      window.priceDivObserver = null;
    }
    
    return { 
      success: true, 
      hidden: hide,
      count: priceDivs.length 
    };
  } catch (error) {
    console.error('Error toggling price divs:', error);
    return { success: false, error: error.message };
  }
}

// Initialize price div visibility on page load
(function initPriceDivVisibility() {
  const checkAndHide = () => {
    browser.storage.local.get('priceDivsHidden').then(result => {
      const shouldHide = result.priceDivsHidden || false;
      
      if (shouldHide) {
        // If DOM is ready, hide immediately, otherwise wait
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => togglePriceDivs(true), 100);
          });
        } else {
          setTimeout(() => togglePriceDivs(true), 100);
        }
      }
    }).catch(error => {
      console.error('Error initializing price div visibility:', error);
    });
  };
  
  // Check immediately if DOM is already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndHide);
  } else {
    checkAndHide();
  }
})();
