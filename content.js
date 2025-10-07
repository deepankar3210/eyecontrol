// Content script for Eye-Controlled Scrolling Extension
class EyeControlManager {
  constructor() {
    this.isInitialized = false;
    this.settings = {
      autoScroll: false,
      singleBlink: false,
      doubleBlink: false,
      gazeSensitivity: 5,
      blinkSensitivity: 5,
    };

    // Eye tracking state
    this.gazePosition = { x: 0, y: 0 };
    this.lastGazeTime = 0;
    this.scrollThreshold = 100; // pixels from edge to trigger scroll
    this.scrollSpeed = 2;
    this.isScrolling = false;

    // Blink detection state
    this.blinkHistory = [];
    this.lastBlinkTime = 0;
    this.doubleBlinkWindow = 500; // ms
    this.isBlinking = false;

    // Statistics
    this.stats = {
      blinkCount: 0,
      scrollCount: 0,
    };

    // Calibration state
    this.isCalibrating = false;
    this.calibrationPoints = [];

    this.init();
  }

  async init() {
    if (this.isInitialized) return;

    console.log("Eye Control Manager: Starting initialization...");

    try {
      console.log("Eye Control Manager: Loading settings...");
      await this.loadSettings();

      console.log("Eye Control Manager: Loading external libraries...");
      await this.loadExternalLibraries();

      console.log("Eye Control Manager: Setting up message listener...");
      this.setupMessageListener();

      console.log("Eye Control Manager: Setting up eye tracking...");
      await this.setupEyeTracking();

      this.isInitialized = true;
      console.log("Eye Control Manager: Fully initialized successfully!");
    } catch (error) {
      console.error("Eye Control Manager: Failed to initialize:", error);
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_SETTINGS",
      });
      if (response && response.settings) {
        this.settings = { ...this.settings, ...response.settings };
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async loadExternalLibraries() {
    return new Promise((resolve, reject) => {
      // Create a script element for WebGazer
      const webgazerScript = document.createElement("script");
      webgazerScript.src = chrome.runtime.getURL("lib/webgazer.js");
      webgazerScript.async = true;

      webgazerScript.onload = () => {
        console.log("WebGazer.js loaded successfully");

        // Load TensorFlow after webgazer loads
        const tfScript = document.createElement("script");
        tfScript.src = chrome.runtime.getURL("lib/tf.min.js");
        tfScript.async = true;

        tfScript.onload = () => {
          console.log("TensorFlow.js loaded successfully");
          window.eyeControlLibrariesLoaded = true;
          resolve();
        };

        tfScript.onerror = (error) => {
          console.error("Failed to load TensorFlow.js:", error);
          reject(new Error("TensorFlow.js failed to load"));
        };

        document.head.appendChild(tfScript);
      };

      webgazerScript.onerror = (error) => {
        console.error("Failed to load WebGazer.js:", error);
        reject(new Error("WebGazer.js failed to load"));
      };

      document.head.appendChild(webgazerScript);

      // Add timeout
      setTimeout(() => {
        if (!window.eyeControlLibrariesLoaded) {
          console.warn("Library loading timed out");
          reject(new Error("Loading timed out"));
        }
      }, 10000);
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case "SETTINGS_UPDATE":
          this.settings = { ...this.settings, ...message.settings };
          this.updateEyeTracking();
          break;

        case "START_CALIBRATION":
          this.startCalibration();
          break;

        case "PAGE_READY":
          // Reinitialize if needed
          if (!this.isInitialized) {
            this.init();
          }
          break;
      }
    });
  }

  //   async waitForWebgazer(maxAttempts = 20, dela y = 200) {
  //     for (let i = 0; i < maxAttempts; i++) {
  //       if (window.webgazer) return window.webgazer;
  //       await new Promise((res) => setTimeout(res, delay));
  //     }
  //     throw new Error("webgazer not loaded after waiting");
  //   }

  async setupEyeTracking() {
    try {
      // Create and append script element for eye tracking setup
      const setupScript = document.createElement("script");
      setupScript.src = chrome.runtime.getURL("lib/eye-tracking-setup.js");
      setupScript.type = "text/javascript";

      // Wait for the script to load
      await new Promise((resolve, reject) => {
        setupScript.onload = resolve;
        setupScript.onerror = reject;
        (document.head || document.documentElement).appendChild(setupScript);
      });
      // ✅ ensures webgazer is defined
      //   await this.waitForWebgazer();
      // Set up message listener for gaze data
      this.setupGazeMessageListener();

      // Set up blink detection
      this.setupBlinkDetection();

      console.log("Eye tracking setup initiated");
    } catch (error) {
      console.error("Failed to setup eye tracking:", error);
    }
  }

  setupGazeMessageListener() {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;

      switch (event.data.type) {
        case "GAZE_DATA":
          if (this.settings.autoScroll) {
            this.handleGazeData(event.data.data, event.data.data.timestamp);
          }
          break;

        case "EYE_TRACKING_READY":
          if (this.settings.singleBlink) {
            console.log("EYE_TRACKING_READY");
            this.handleBlink(Date.now());
          }
          break;

        case "EYE_TRACKING_ERROR":
          console.error("Eye tracking error:", event.data.error);
          break;
      }
    });
  }

  setupBlinkDetection() {
    // Verify WebGazer is loaded before attempting to use it
    if (typeof webgazer === "undefined" || !webgazer) {
      console.error("Cannot setup blink detection: WebGazer not loaded");
      return;
    }

    console.log("Setting up WebGazer blink detection...");

    try {
      const threshold = Math.max(
        0.1,
        Math.min(1.0, this.settings.blinkSensitivity / 10)
      );

      // Check if setBlinkDetectionMethod exists
      if (typeof webgazer.setBlinkDetectionMethod === "function") {
        webgazer.setBlinkDetectionMethod("gradient", {
          blinkThreshold: threshold,
          minimumBlinkTime: 50,
          maximumBlinkTime: 300,
        });
        console.log("WebGazer blink detection method configured");
      } else {
        console.warn("webgazer.setBlinkDetectionMethod not available");
      }

      // Check if event listener exists
      if (typeof webgazer.on === "function") {
        webgazer.on("blink", (data) => {
          if (data?.type === "blink") {
            console.log("Real blink detected via WebGazer");
            this.handleBlink(Date.now());
          }
        });
        console.log("WebGazer blink event listener registered");
      } else {
        console.warn(
          "webgazer.on not available, using fallback blink detection"
        );
      }

      console.log("WebGazer blink detection initialized successfully");
    } catch (error) {
      console.error("Error setting up WebGazer blink detection:", error);
    }

    // Keyboard fallback for testing (always available)
    document.addEventListener("keydown", (event) => {
      if (!this.isInitialized) return;

      if (
        event.code === "Space" &&
        this.settings.singleBlink &&
        !event.repeat
      ) {
        console.log("Simulating single blink (spacebar pressed)");
        event.preventDefault();
        this.handleBlink(Date.now());
      } else if (
        event.code === "KeyB" &&
        this.settings.doubleBlink &&
        !event.repeat
      ) {
        console.log("Simulating double blink (B key pressed)");
        event.preventDefault();
        this.handleDoubleBlink();
      }
    });

    console.log("Blink detection setup complete");
  }

  detectBlink(faceParameters) {
    // Only run if WebGazer is available and initialized
    if (typeof webgazer === "undefined" || !webgazer) {
      return;
    }

    if (!faceParameters?.eyeFeatures) return;

    const EYE_AR_THRESH = Math.max(
      0.1,
      0.3 - this.settings.blinkSensitivity * 0.02
    );
    const EYE_AR_CONSEC_FRAMES = 2;
    const MIN_BLINK_INTERVAL = 200;

    const leftEAR = this.calculateEyeAspectRatio(
      faceParameters.eyeFeatures.left
    );
    const rightEAR = this.calculateEyeAspectRatio(
      faceParameters.eyeFeatures.right
    );
    const avgEAR = (leftEAR + rightEAR) / 2.0;
    const currentTime = Date.now();

    // Debounce blink detection
    if (currentTime - this.lastBlinkTime < MIN_BLINK_INTERVAL) {
      return;
    }

    if (avgEAR < EYE_AR_THRESH) {
      this.blinkCounter++;

      if (this.blinkCounter >= EYE_AR_CONSEC_FRAMES && !this.isBlinking) {
        this.isBlinking = true;
        this.handleBlink(currentTime);
      }
    } else {
      this.blinkCounter = 0;
      this.isBlinking = false;
    }
  }

  calculateEyeAspectRatio(eyeFeatures) {
    const DEFAULT_EAR = 0.3;

    if (!eyeFeatures?.landmarks || !Array.isArray(eyeFeatures.landmarks)) {
      return DEFAULT_EAR;
    }

    try {
      const landmarks = eyeFeatures.landmarks;

      // Validate landmarks
      if (
        landmarks.length < 6 ||
        !landmarks.every((l) => Array.isArray(l) && l.length >= 2)
      ) {
        return DEFAULT_EAR;
      }

      const upperY = Math.min(landmarks[1][1], landmarks[2][1]);
      const lowerY = Math.max(landmarks[4][1], landmarks[5][1]);
      const leftX = landmarks[0][0];
      const rightX = landmarks[3][0];

      const eyeHeight = Math.abs(lowerY - upperY);
      const eyeWidth = Math.abs(rightX - leftX);

      if (eyeWidth === 0 || !isFinite(eyeHeight) || !isFinite(eyeWidth)) {
        return DEFAULT_EAR;
      }

      const aspectRatio = eyeHeight / eyeWidth;

      // Sanity check
      return aspectRatio >= 0 && aspectRatio <= 1 ? aspectRatio : DEFAULT_EAR;
    } catch (error) {
      console.warn("Error calculating eye aspect ratio:", error);
      return DEFAULT_EAR;
    }
  }

  handleBlink(currentTime) {
    const MIN_BLINK_INTERVAL = 200;

    // Debounce
    if (
      this.lastBlinkTime &&
      currentTime - this.lastBlinkTime < MIN_BLINK_INTERVAL
    ) {
      return;
    }

    this.stats.blinkCount++;
    this.blinkHistory.push(currentTime);

    // Clean up old blink history
    const recentWindow = this.doubleBlinkWindow * 2;
    this.blinkHistory = this.blinkHistory.filter(
      (time) => currentTime - time < recentWindow
    );

    // Check for double blink
    if (this.settings.doubleBlink && this.blinkHistory.length >= 2) {
      const lastTwoBlinks = this.blinkHistory.slice(-2);
      const timeBetweenBlinks = lastTwoBlinks[1] - lastTwoBlinks[0];

      if (timeBetweenBlinks <= this.doubleBlinkWindow) {
        this.handleDoubleBlink();
        this.blinkHistory = [];
        this.lastBlinkTime = currentTime;
        return;
      }
    }

    // Handle single blink
    if (this.settings.singleBlink) {
      this.simulateClick();
    }

    this.updateStats();
    this.lastBlinkTime = currentTime;
  }

  handleGazeData(data, clock) {
    this.gazePosition = { x: data.x, y: data.y };
    this.lastGazeTime = clock;

    if (!this.isScrolling) {
      this.checkForScrollAction();
    }
  }

  checkForScrollAction() {
    const windowHeight = window.innerHeight;
    const scrollThreshold =
      this.scrollThreshold * (this.settings.gazeSensitivity / 5);

    // Check if gaze is near top or bottom of screen
    if (this.gazePosition.y < scrollThreshold) {
      // Scroll up
      this.startScrolling("up");
    } else if (this.gazePosition.y > windowHeight - scrollThreshold) {
      // Scroll down
      this.startScrolling("down");
    }
  }

  startScrolling(direction) {
    if (this.isScrolling) return;

    this.isScrolling = true;
    const scrollAmount = this.scrollSpeed * (this.settings.gazeSensitivity / 2);

    const scroll = () => {
      if (!this.settings.autoScroll || !this.isScrolling) {
        this.isScrolling = false;
        return;
      }

      const currentScroll = window.pageYOffset;

      if (direction === "up" && this.gazePosition.y < this.scrollThreshold) {
        window.scrollBy(0, -scrollAmount);
        this.stats.scrollCount++;
      } else if (
        direction === "down" &&
        this.gazePosition.y > window.innerHeight - this.scrollThreshold
      ) {
        window.scrollBy(0, scrollAmount);
        this.stats.scrollCount++;
      } else {
        this.isScrolling = false;
        return;
      }

      // Continue scrolling
      setTimeout(scroll, 50);
    };

    scroll();
  }

  simulateClick() {
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === "A" ||
        activeElement.tagName === "BUTTON" ||
        activeElement.onclick ||
        activeElement.addEventListener)
    ) {
      activeElement.click();
      console.log("Simulated click on element:", activeElement);
    } else {
      // Try to find clickable element under gaze
      const element = document.elementFromPoint(
        this.gazePosition.x,
        this.gazePosition.y
      );
      if (element && this.isClickableElement(element)) {
        element.click();
        console.log("Simulated click on gazed element:", element);
      } else {
        console.log("Gazed element is not clickable:", element);
      }
    }
  }

  isClickableElement(element) {
    const clickableTags = ["A", "BUTTON", "INPUT"];
    return (
      clickableTags.includes(element.tagName) ||
      element.onclick ||
      element.getAttribute("role") === "button" ||
      element.classList.contains("clickable")
    );
  }

  handleDoubleBlink() {
    console.log("Double blink detected - navigating back");
    chrome.runtime.sendMessage({ type: "NAVIGATE_BACK" });
  }

  async startCalibration() {
    this.isCalibrating = true;
    console.log("Starting calibration...");

    // Create calibration overlay
    const overlay = this.createCalibrationOverlay();
    document.body.appendChild(overlay);

    // Show calibration points
    await this.showCalibrationPoints();

    // Remove overlay after calibration
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      this.isCalibrating = false;
      console.log("Calibration completed");
    }, 5000);
  }

  createCalibrationOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "eye-control-calibration";
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: Arial, sans-serif;
        `;

    overlay.innerHTML = `
            <h2>Eye Tracking Calibration</h2>
            <p>Look at the red dots as they appear on screen</p>
            <div id="calibration-point" style="
                width: 20px;
                height: 20px;
                background: red;
                border-radius: 50%;
                position: absolute;
                transition: all 0.5s ease;
            "></div>
        `;

    return overlay;
  }

  async showCalibrationPoints() {
    const points = [
      { x: "10%", y: "10%" },
      { x: "90%", y: "10%" },
      { x: "50%", y: "50%" },
      { x: "10%", y: "90%" },
      { x: "90%", y: "90%" },
    ];

    const pointElement = document.getElementById("calibration-point");

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      pointElement.style.left = point.x;
      pointElement.style.top = point.y;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  updateEyeTracking() {
    // Update WebGazer settings based on new configuration
    if (typeof webgazer !== "undefined") {
      if (
        this.settings.autoScroll ||
        this.settings.singleBlink ||
        this.settings.doubleBlink
      ) {
        webgazer.resume();
      } else {
        webgazer.pause();
      }
    }
  }

  updateStats() {
    chrome.runtime.sendMessage({
      type: "UPDATE_STATS",
      stats: this.stats,
    });
  }
}

// Initialize when DOM is ready
console.log(
  "Eye Control Extension: Content script loaded, readyState:",
  document.readyState
);

if (document.readyState === "loading") {
  console.log("Eye Control Extension: Waiting for DOMContentLoaded...");
  document.addEventListener("DOMContentLoaded", () => {
    console.log(
      "Eye Control Extension: DOMContentLoaded fired, initializing..."
    );
    try {
      new EyeControlManager();
    } catch (error) {
      console.error("Eye Control Extension: Initialization failed:", error);
    }
  });
} else {
  console.log(
    "Eye Control Extension: DOM already loaded, initializing immediately..."
  );
  try {
    new EyeControlManager();
  } catch (error) {
    console.error("Eye Control Extension: Initialization failed:", error);
  }
}
