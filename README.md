# Eye-Controlled Scrolling Extension

A Chrome browser extension that enables hands-free web navigation through eye-tracking and blink detection.

## Features

- **Auto-Scroll**: Automatically scroll web pages by looking at the top or bottom of your browser window
- **Single Blink Click**: Click on buttons, links, and interactive elements with a single blink
- **Double Blink Navigation**: Navigate back to the previous page with a double blink
- **Customizable Settings**: Adjust sensitivity for eye-tracking and blink detection
- **Usage Statistics**: Track your interactions and usage patterns
- **Calibration System**: Calibrate eye-tracking for improved accuracy

## Installation

### Development Installation (Chrome)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" and select the extension folder containing manifest.json
4. The Eye-Controlled Scrolling extension icon should appear in your toolbar
5. Grant camera permissions when prompted (required for eye-tracking)
6. Click the extension icon to open the popup and configure your settings

**Note**: The extension will request camera permissions on first use for eye-tracking functionality.

### Required Permissions

The extension requires the following permissions:

- **activeTab**: To interact with the current active tab
- **tabs**: To navigate to previous pages using double blink
- **scripting**: To inject eye-tracking scripts into web pages

## Usage

### Getting Started

1. Click the extension icon in your Chrome toolbar
2. Enable the features you want to use:
   - **Auto-Scroll**: For gaze-based scrolling
   - **Single Blink Click**: For blink-to-click functionality
   - **Double Blink Back**: For blink-based navigation
3. Click "Calibrate Eye Tracking" for optimal performance
4. Adjust sensitivity settings as needed

### Features in Detail

#### Auto-Scroll

- Look at the top 10% of your browser window to scroll up
- Look at the bottom 10% of your browser window to scroll down
- Scrolling speed adjusts based on gaze sensitivity setting

#### Single Blink Click

- Focus on clickable elements (buttons, links, etc.)
- Perform a single deliberate blink to click
- Works with most interactive web elements

#### Double Blink Navigation

- Perform two quick blinks within 500ms to go back
- Equivalent to clicking the browser's back button
- Useful for hands-free navigation

#### Calibration

- Follow the red dots that appear on screen
- Look directly at each calibration point for best results
- Recalibrate if accuracy decreases over time

## Settings

- **Gaze Sensitivity**: Controls how sensitive eye-tracking is (1-10)
- **Blink Detection Sensitivity**: Adjusts blink detection threshold (1-10)
- **Feature Toggles**: Enable/disable individual features as needed

## Technical Details

### Libraries Used

- **WebGazer.js**: Real-time eye-tracking in the browser
- **TensorFlow.js**: Machine learning for blink detection
- **Chrome Extension APIs**: Browser integration and tab management

### Browser Support

- Chrome (Manifest V3)
- Other Chromium-based browsers
- Firefox support planned for future releases

### Performance Notes

- Eye-tracking requires camera access on first use
- Works best in well-lit environments
- Minimal impact on browser performance when inactive

## Testing

A test page is included (`test-page.html`) with various interactive elements to verify functionality:

1. Start the test server: `python -m http.server 5000`
2. Navigate to `http://localhost:5000/test-page.html`
3. Install the extension and test each feature
4. Use the test page's interactive elements to verify click detection

## Privacy & Security

- All eye-tracking processing happens locally in your browser
- No personal data or tracking information is sent to external servers
- Camera access is only used for eye-tracking calculations
- Settings and statistics are stored locally in your browser

## Troubleshooting

### Eye-tracking not working

- Ensure camera permissions are granted
- Check that you're in a well-lit environment
- Try running calibration again
- Verify WebGazer.js loaded successfully in browser console

### Blink detection issues

- Adjust blink sensitivity in settings
- Ensure your face is clearly visible to the camera
- Check that TensorFlow.js loaded successfully

### General issues

- Refresh the page and try again
- Check browser console for error messages
- Verify extension permissions are granted
- Try disabling and re-enabling features

## Development

### File Structure

```
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Content script with eye-tracking
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── styles.css             # UI styling
├── icons/                 # Extension icons
├── lib/                   # Extension core libraries
├── test-page.html         # Testing page
├── extension-debug.html   # Testing library is getting loaded as expected
└── debug-test.html        # Testing library availability
```

### Key Components

- **Background Service Worker**: Manages extension state and browser interactions
- **Content Script**: Handles eye-tracking, blink detection, and page interactions
- **Popup Interface**: User controls and settings management

## Contributing

This is an experimental extension demonstrating eye-tracking capabilities in web browsers. Contributions and improvements are welcome.

## Limitations

- Requires good lighting conditions for optimal eye-tracking
- Camera quality affects tracking accuracy
- Blink detection is simplified and may need calibration
- Performance varies across different devices and browsers
- Not suitable for users with certain visual impairments

## Future Enhancements

- Improved blink detection algorithms
- Additional gesture recognition
- Firefox and Edge browser support
- Advanced calibration procedures
- Accessibility features and keyboard shortcuts
- Eye-based text selection and cursor control
