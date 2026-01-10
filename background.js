// Background script for Wimood Cart Manager
// Handles keyboard commands and messages

// Use browser API (Firefox) or chrome API (Chrome)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Handle keyboard commands
browserAPI.commands.onCommand.addListener(async (command) => {
  try {
    // Get the active tab
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes('wimoodshop.nl')) {
      return;
    }
    
    // Send message to content script
    if (command === 'toggle-prices') {
      // Toggle prices permanently
      browserAPI.tabs.sendMessage(tab.id, {
        action: 'keyboardTogglePrices'
      }).catch(err => {
        // Content script might not be ready, ignore
        console.log('Could not send message to content script:', err);
      });
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
});

// Note: For Firefox, users can rebind this command in:
// about:addons -> Extensions -> Wimood Cart Manager -> Manage -> Keyboard Shortcuts
