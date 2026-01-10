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
          const toggleResult = togglePriceDivs(request.hide, false);
          if (toggleResult.success) {
            await setPriceHiddenState(request.hide);
          }
          sendResponse(toggleResult);
          break;
        
        case 'keyboardTogglePrices':
          // Handle keyboard command from background script
          // When prices are shown: hide them
          // When prices are hidden: toggle to show (hold functionality handled by keyboard listener)
          const currentState = await getPriceHiddenState();
          const newState = !currentState;
          const toggleRes = togglePriceDivs(newState, false);
          if (toggleRes.success) {
            await setPriceHiddenState(newState);
          }
          sendResponse(toggleRes);
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

// Price-related selectors
const PRICE_SELECTORS = [
  '.product-detail__price',
  '.product-detail__unit-price',
  '.product-card__price',
  '.text--info[role="alert"]',
  '.text--valid[role="alert"]'
];

// Also hide h5 elements that contain price text (always hide these)
function isPriceH5(element) {
  if (element.tagName !== 'H5') return false;
  const text = element.textContent || '';
  // Check if it contains price-related text (e.g., "Totaal €", "€ X excl. BTW")
  return /(?:Totaal|€|excl\.?\s*BTW)/i.test(text);
}

// Store original display styles
let originalStyles = new Map();

// Get all price elements
function getAllPriceElements() {
  const elements = [];
  
  // Handle standard selectors
  PRICE_SELECTORS.forEach(selector => {
    try {
      elements.push(...document.querySelectorAll(selector));
    } catch (e) {
      console.warn('Selector error:', selector, e);
    }
  });
  
  // Always add h5 elements with prices
  document.querySelectorAll('h5').forEach(h5 => {
    if (isPriceH5(h5)) {
      elements.push(h5);
    }
  });
  
  return elements;
}

// Toggle visibility of all price-related elements
function togglePriceDivs(hide, temporary = false) {
  try {
    const priceElements = getAllPriceElements();
    
    if (priceElements.length === 0) {
      return { success: false, error: 'No price elements found on the page' };
    }
    
    priceElements.forEach(element => {
      if (hide) {
        // Store original display style if not already stored
        if (!originalStyles.has(element)) {
          originalStyles.set(element, element.style.display || '');
        }
        element.style.display = 'none';
      } else {
        // Restore original display style
        const originalStyle = originalStyles.get(element);
        if (originalStyle !== undefined) {
          element.style.display = originalStyle;
          if (!temporary) {
            originalStyles.delete(element);
          }
        } else {
          element.style.display = '';
        }
      }
    });
    
    // Also handle dynamically added elements using MutationObserver
    if (hide && !window.priceDivObserver) {
      window.priceDivObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Check each selector
              PRICE_SELECTORS.forEach(selector => {
                // Check if the added node matches the selector
                try {
                  if (node.matches && node.matches(selector)) {
                    if (!originalStyles.has(node)) {
                      originalStyles.set(node, node.style.display || '');
                    }
                    node.style.display = 'none';
                  }
                  // Check for price elements within the added node
                  if (node.querySelectorAll) {
                    const nestedElements = node.querySelectorAll(selector);
                    nestedElements.forEach(el => {
                      if (!originalStyles.has(el)) {
                        originalStyles.set(el, el.style.display || '');
                      }
                      el.style.display = 'none';
                    });
                  }
                } catch (e) {
                  // Ignore selector errors
                  console.warn('Selector error:', e);
                }
              });
              
              // Check for h5 price elements
              if (node.tagName === 'H5' && isPriceH5(node)) {
                if (!originalStyles.has(node)) {
                  originalStyles.set(node, node.style.display || '');
                }
                node.style.display = 'none';
              }
              
              // Check for h5 elements within the added node
              if (node.querySelectorAll) {
                const nestedH5s = node.querySelectorAll('h5');
                nestedH5s.forEach(h5 => {
                  if (isPriceH5(h5)) {
                    if (!originalStyles.has(h5)) {
                      originalStyles.set(h5, h5.style.display || '');
                    }
                    h5.style.display = 'none';
                  }
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
    } else if (!hide && !temporary && window.priceDivObserver) {
      window.priceDivObserver.disconnect();
      window.priceDivObserver = null;
    }
    
    return { 
      success: true, 
      hidden: hide,
      count: priceElements.length 
    };
  } catch (error) {
    console.error('Error toggling price divs:', error);
    return { success: false, error: error.message };
  }
}

// Get current hidden state
async function getPriceHiddenState() {
  try {
    const result = await browser.storage.local.get('priceDivsHidden');
    return result.priceDivsHidden || false;
  } catch (error) {
    console.error('Error getting price hidden state:', error);
    return false;
  }
}

// Set price hidden state
async function setPriceHiddenState(hidden) {
  try {
    await browser.storage.local.set({ priceDivsHidden: hidden });
  } catch (error) {
    console.error('Error setting price hidden state:', error);
  }
}

// Hold functionality: Listen for Alt+P keydown/keyup for temporary show when hidden
// Note: The main toggle uses the commands API (rebindable in Firefox settings)
// When prices are hidden and Alt+P is held, prices are shown temporarily
// When released, prices are hidden again
let isAltPHeld = false;
let wasTemporarilyShown = false;
let holdTimeout = null;

async function handleHoldKey(e) {
  // Listen for Alt+P (default command key) for hold functionality
  // Commands API doesn't support keydown/keyup, so we use this for hold behavior
  if (e.key.toLowerCase() === 'p' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
    // Ignore if user is typing in an input, textarea, or contenteditable
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    if (e.type === 'keydown' && !isAltPHeld) {
      isAltPHeld = true;
      const currentlyHidden = await getPriceHiddenState();
      
      // If prices are hidden, show them temporarily after a short delay
      // This delay allows the command to fire first (which will show prices)
      // Then if key is still held, we keep them shown temporarily
      if (currentlyHidden) {
        holdTimeout = setTimeout(async () => {
          const stillHidden = await getPriceHiddenState();
          // If prices were shown by command, check if they should be kept visible
          // But if command didn't fire or prices are now shown, mark as temporarily shown
          if (!stillHidden && isAltPHeld) {
            wasTemporarilyShown = true;
          }
        }, 150);
      }
    } else if (e.type === 'keyup' && isAltPHeld) {
      isAltPHeld = false;
      if (holdTimeout) {
        clearTimeout(holdTimeout);
        holdTimeout = null;
      }
      
      // When releasing Alt+P, if prices were temporarily shown, hide them again
      if (wasTemporarilyShown) {
        const currentlyHidden = await getPriceHiddenState();
        if (!currentlyHidden) {
          // Prices are currently shown, hide them and restore hidden state
          togglePriceDivs(true, false);
          await setPriceHiddenState(true);
          wasTemporarilyShown = false;
        }
      }
    }
  } else if (e.type === 'keyup' && (e.key === 'Alt' || e.key === 'Meta')) {
    // Cleanup if Alt is released while P might still be held
    if (isAltPHeld && wasTemporarilyShown) {
      const currentlyHidden = await getPriceHiddenState();
      if (!currentlyHidden) {
        togglePriceDivs(true, false);
        setPriceHiddenState(true);
      }
      wasTemporarilyShown = false;
    }
    isAltPHeld = false;
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
  }
}

// Setup keyboard listeners for hold functionality
document.addEventListener('keydown', handleHoldKey);
document.addEventListener('keyup', handleHoldKey);

// Reset key state if window loses focus
window.addEventListener('blur', async () => {
  if (isAltPHeld && wasTemporarilyShown) {
    const currentlyHidden = await getPriceHiddenState();
    if (!currentlyHidden) {
      togglePriceDivs(true, false);
      await setPriceHiddenState(true);
    }
    wasTemporarilyShown = false;
  }
  isAltPHeld = false;
  if (holdTimeout) {
    clearTimeout(holdTimeout);
    holdTimeout = null;
  }
});

// Initialize price div visibility on page load
(function initPriceDivVisibility() {
  const checkAndHide = () => {
    browser.storage.local.get('priceDivsHidden').then(result => {
      const shouldHide = result.priceDivsHidden || false;
      
      if (shouldHide) {
        // If DOM is ready, hide immediately, otherwise wait
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => togglePriceDivs(true, false), 100);
          });
        } else {
          setTimeout(() => togglePriceDivs(true, false), 100);
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
