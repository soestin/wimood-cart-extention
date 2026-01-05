# Wimood Cart Manager

A Firefox browser extension that allows you to save, load, and manage multiple shopping carts on [wimoodshop.nl](https://wimoodshop.nl).

## Features

- **Save Carts**: Save your current shopping cart with a custom name
- **Load Carts**: Quickly load any previously saved cart
- **Overwrite Carts**: Update existing saved carts with your current cart contents
- **Delete Carts**: Remove saved carts you no longer need
- **Clear Cart**: Clear your current cart with one click
- **Persistent Storage**: All saved carts are stored locally in your browser

## Installation

### From Source

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Select the `manifest.json` file from this directory

### From ZIP

1. Download the `wimood-extension.zip` file
2. Extract it to a folder
3. Follow steps 2-5 from "From Source" above

## Usage

1. Navigate to [wimoodshop.nl](https://wimoodshop.nl) and add items to your cart
2. Click the extension icon in your Firefox toolbar
3. Enter a name for your cart and click "Save Cart"
4. To load a saved cart, click the "Load" button next to the cart name
5. To overwrite a saved cart with your current cart, click "Overwrite"
6. To delete a saved cart, click "Delete"

## Permissions

This extension requires the following permissions:

- **Storage**: To save and retrieve your cart data locally
- **Active Tab**: To access the current tab's cart information
- **Scripting**: To interact with the wimoodshop.nl website
- **Tabs**: To communicate with content scripts
- **Host Permissions** (`https://wimoodshop.nl/*`): To access the wimoodshop.nl API

## Privacy

- All cart data is stored locally in your browser
- No data is transmitted to external servers
- The extension only communicates with wimoodshop.nl to manage your cart

## Technical Details

- **Manifest Version**: 3
- **Browser Support**: Firefox 109+
- **Storage**: Browser local storage API
- **API**: Uses wimoodshop.nl's cart API endpoints

## Development

### Project Structure

```
wimood-extention/
├── manifest.json       # Extension manifest
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── popup.css           # Popup styles
├── content.js          # Content script for cart API interaction
├── icons/              # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── LICENSE             # MIT License
```

### Building

No build process required. The extension uses vanilla JavaScript and can be loaded directly.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Justin Soestin

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you encounter any issues or have feature requests, please open an issue on the project repository.

