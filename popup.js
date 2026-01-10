// Popup script for Wimood Cart Manager

const API_BASE = 'https://wimoodshop.nl/ajax/cart';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await updateCurrentCartInfo();
  await loadSavedCarts();
  
  // Event listeners
  document.getElementById('save-cart-btn').addEventListener('click', handleSaveCart);
  document.getElementById('clear-cart-btn').addEventListener('click', handleClearCart);
  document.getElementById('toggle-price-btn').addEventListener('click', handleTogglePriceDivs);
  
  // Update button state based on stored preference
  updatePriceToggleButtonState();
  
  // Allow Enter key to save cart
  document.getElementById('cart-name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSaveCart();
    }
  });
  
  // Event delegation for dynamically created buttons
  document.getElementById('saved-carts-list').addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('btn')) {
      const cartIndex = parseInt(target.getAttribute('data-cart-index'));
      if (isNaN(cartIndex)) return;
      
      if (target.classList.contains('btn-primary')) {
        // Load button
        handleLoadCart(cartIndex);
      } else if (target.classList.contains('btn-secondary')) {
        // Delete button
        handleDeleteCart(cartIndex);
      } else if (target.classList.contains('btn-overwrite')) {
        // Overwrite button
        handleOverwriteCart(cartIndex);
      }
    }
  });
});

// Update current cart count display
async function updateCurrentCartInfo() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('wimoodshop.nl')) {
      document.getElementById('current-cart-count').textContent = 'Please navigate to wimoodshop.nl';
      return;
    }

    const response = await browser.tabs.sendMessage(tab.id, { action: 'getCart' });
    
    if (response.success) {
      const count = response.data.count || 0;
      document.getElementById('current-cart-count').textContent = 
        `Current cart: ${count} item${count !== 1 ? 's' : ''}`;
    } else {
      document.getElementById('current-cart-count').textContent = 
        'Unable to load cart info';
    }
  } catch (error) {
    console.error('Error updating cart info:', error);
    document.getElementById('current-cart-count').textContent = 'Error loading cart';
  }
}

// Load and display saved carts
async function loadSavedCarts() {
  try {
    const result = await browser.storage.local.get('savedCarts');
    const savedCarts = result.savedCarts || [];
    const cartsList = document.getElementById('saved-carts-list');
    
    // Clear existing content
    cartsList.textContent = '';
    
    if (savedCarts.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'No saved carts yet';
      cartsList.appendChild(emptyState);
      return;
    }
    
    savedCarts.forEach((cart, index) => {
      const date = new Date(cart.savedAt);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const productCount = cart.products.length;
      
      // Create cart item container
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'cart-item-header';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'cart-item-name';
      nameSpan.textContent = cart.name;
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'cart-item-date';
      dateSpan.textContent = dateStr;
      
      header.appendChild(nameSpan);
      header.appendChild(dateSpan);
      
      // Create info
      const info = document.createElement('div');
      info.className = 'cart-item-info';
      info.textContent = `${productCount} product${productCount !== 1 ? 's' : ''}`;
      
      // Create actions
      const actions = document.createElement('div');
      actions.className = 'cart-item-actions';
      
      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-primary';
      loadBtn.setAttribute('data-cart-index', index.toString());
      loadBtn.textContent = 'Load';
      
      const overwriteBtn = document.createElement('button');
      overwriteBtn.className = 'btn btn-overwrite';
      overwriteBtn.setAttribute('data-cart-index', index.toString());
      overwriteBtn.textContent = 'Overwrite';
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-secondary';
      deleteBtn.setAttribute('data-cart-index', index.toString());
      deleteBtn.textContent = 'Delete';
      
      actions.appendChild(loadBtn);
      actions.appendChild(overwriteBtn);
      actions.appendChild(deleteBtn);
      
      // Assemble cart item
      cartItem.appendChild(header);
      cartItem.appendChild(info);
      cartItem.appendChild(actions);
      
      cartsList.appendChild(cartItem);
    });
  } catch (error) {
    console.error('Error loading saved carts:', error);
    showStatus('Error loading saved carts', 'error');
  }
}

// Handle load cart
async function handleLoadCart(index) {
  try {
    const result = await browser.storage.local.get('savedCarts');
    const savedCarts = result.savedCarts || [];
    
    if (index < 0 || index >= savedCarts.length) {
      showStatus('Cart not found', 'error');
      return;
    }
    
    const cart = savedCarts[index];
    showStatus('Loading cart...', 'info');
    
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('wimoodshop.nl')) {
      showStatus('Please navigate to wimoodshop.nl first', 'error');
      return;
    }
    
    const response = await browser.tabs.sendMessage(tab.id, {
      action: 'loadCart',
      products: cart.products
    });
    
    if (response.success) {
      showStatus(`Cart "${escapeHtml(cart.name)}" loaded successfully!`, 'success');
      await updateCurrentCartInfo();
      // Refresh the page to show updated cart
      setTimeout(() => {
        browser.tabs.reload(tab.id);
      }, 1000);
    } else {
      showStatus(`Error loading cart: ${response.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error loading cart:', error);
    showStatus('Error loading cart', 'error');
  }
}

// Handle overwrite cart
async function handleOverwriteCart(index) {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('wimoodshop.nl')) {
      showStatus('Please navigate to wimoodshop.nl first', 'error');
      return;
    }
    
    const result = await browser.storage.local.get('savedCarts');
    const savedCarts = result.savedCarts || [];
    
    if (index < 0 || index >= savedCarts.length) {
      showStatus('Cart not found', 'error');
      return;
    }
    
    const existingCart = savedCarts[index];
    
    if (!confirm(`Overwrite cart "${escapeHtml(existingCart.name)}" with current cart contents?`)) {
      return;
    }
    
    showStatus('Overwriting cart...', 'info');
    
    const response = await browser.tabs.sendMessage(tab.id, { action: 'getCart' });
    
    if (!response.success) {
      showStatus('Error fetching current cart', 'error');
      return;
    }
    
    const cartData = response.data;
    const products = (cartData.products || []).map(p => ({
      productId: p.productId,
      quantity: p.quantity
    }));
    
    if (products.length === 0) {
      showStatus('Current cart is empty. Cannot overwrite with empty cart.', 'error');
      return;
    }
    
    // Update the existing cart with current cart contents
    savedCarts[index] = {
      name: existingCart.name,
      products: products,
      savedAt: new Date().toISOString()
    };
    
    await browser.storage.local.set({ savedCarts });
    showStatus(`Cart "${escapeHtml(existingCart.name)}" overwritten successfully`, 'success');
    await loadSavedCarts();
  } catch (error) {
    console.error('Error overwriting cart:', error);
    showStatus('Error overwriting cart', 'error');
  }
}

// Handle delete cart
async function handleDeleteCart(index) {
  try {
    const result = await browser.storage.local.get('savedCarts');
    const savedCarts = result.savedCarts || [];
    
    if (index < 0 || index >= savedCarts.length) {
      showStatus('Cart not found', 'error');
      return;
    }
    
    const cartName = savedCarts[index].name;
    savedCarts.splice(index, 1);
    
    await browser.storage.local.set({ savedCarts });
    showStatus(`Cart "${escapeHtml(cartName)}" deleted`, 'success');
    await loadSavedCarts();
  } catch (error) {
    console.error('Error deleting cart:', error);
    showStatus('Error deleting cart', 'error');
  }
}

// Handle save cart
async function handleSaveCart() {
  const nameInput = document.getElementById('cart-name-input');
  const cartName = nameInput.value.trim();
  
  if (!cartName) {
    showStatus('Please enter a cart name', 'error');
    nameInput.focus();
    return;
  }
  
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('wimoodshop.nl')) {
      showStatus('Please navigate to wimoodshop.nl first', 'error');
      return;
    }
    
    showStatus('Saving cart...', 'info');
    
    const response = await browser.tabs.sendMessage(tab.id, { action: 'getCart' });
    
    if (!response.success) {
      showStatus('Error fetching current cart', 'error');
      return;
    }
    
    const cartData = response.data;
    const products = (cartData.products || []).map(p => ({
      productId: p.productId,
      quantity: p.quantity
    }));
    
    if (products.length === 0) {
      showStatus('Cart is empty', 'error');
      return;
    }
    
    // Get existing carts
    const result = await browser.storage.local.get('savedCarts');
    const savedCarts = result.savedCarts || [];
    
    // Check if name already exists
    const existingIndex = savedCarts.findIndex(c => c.name === cartName);
    
    const cartToSave = {
      name: cartName,
      products: products,
      savedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Update existing cart
      savedCarts[existingIndex] = cartToSave;
      showStatus(`Cart "${escapeHtml(cartName)}" updated`, 'success');
    } else {
      // Add new cart
      savedCarts.push(cartToSave);
      showStatus(`Cart "${escapeHtml(cartName)}" saved`, 'success');
    }
    
    await browser.storage.local.set({ savedCarts });
    nameInput.value = '';
    await loadSavedCarts();
  } catch (error) {
    console.error('Error saving cart:', error);
    showStatus('Error saving cart', 'error');
  }
}

// Handle clear cart
async function handleClearCart() {
  if (!confirm('Are you sure you want to clear the current cart? This cannot be undone.')) {
    return;
  }
  
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('wimoodshop.nl')) {
      showStatus('Please navigate to wimoodshop.nl first', 'error');
      return;
    }
    
    showStatus('Clearing cart...', 'info');
    
    const response = await browser.tabs.sendMessage(tab.id, { action: 'clearCart' });
    
    if (response.success) {
      showStatus('Cart cleared successfully', 'success');
      await updateCurrentCartInfo();
      // Refresh the page to show updated cart
      setTimeout(() => {
        browser.tabs.reload(tab.id);
      }, 1000);
    } else {
      showStatus(`Error clearing cart: ${response.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
    showStatus('Error clearing cart', 'error');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type} show`;
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}

// Handle toggle price divs
async function handleTogglePriceDivs() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url || !tab.url.includes('wimoodshop.nl')) {
      showStatus('Please navigate to wimoodshop.nl first', 'error');
      return;
    }
    
    // Get current state from storage
    const result = await browser.storage.local.get('priceDivsHidden');
    const currentlyHidden = result.priceDivsHidden || false;
    const newState = !currentlyHidden;
    
    // Send message to content script
    const response = await browser.tabs.sendMessage(tab.id, {
      action: 'togglePriceDivs',
      hide: newState
    });
    
    if (response.success) {
      // Save state to storage
      await browser.storage.local.set({ priceDivsHidden: newState });
      await updatePriceToggleButtonState();
      showStatus(
        newState ? 'Price divs hidden' : 'Price divs shown',
        'success'
      );
    } else {
      showStatus(`Error: ${response.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Error toggling price divs:', error);
    showStatus('Error toggling price divs', 'error');
  }
}

// Update the toggle button state and text
async function updatePriceToggleButtonState() {
  try {
    const result = await browser.storage.local.get('priceDivsHidden');
    const isHidden = result.priceDivsHidden || false;
    const button = document.getElementById('toggle-price-btn');
    
    if (isHidden) {
      button.textContent = 'Show Price Divs';
      button.classList.remove('btn-secondary');
      button.classList.add('btn-primary');
    } else {
      button.textContent = 'Hide Price Divs';
      button.classList.remove('btn-primary');
      button.classList.add('btn-secondary');
    }
  } catch (error) {
    console.error('Error updating button state:', error);
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
