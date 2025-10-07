function setupEyeTracking() {
  if (typeof webgazer !== "undefined" && !window.eyeTrackingInitialized) {
    window.eyeTrackingInitialized = true;

    webgazer
      .setRegression("ridge")
      .setTracker("clmtrackr")
      .setGazeListener((data, clock) => {
        if (data) {
          window.postMessage(
            {
              type: "GAZE_DATA",
              data: { x: data.x, y: data.y, timestamp: clock },
            },
            "*"
          );
        }
      })
      .begin()
      .then(() => {
        webgazer.showVideoPreview(false);
        webgazer.showPredictionPoints(false);
        console.log("Eye tracking initialized in main world");
        window.postMessage({ type: "EYE_TRACKING_READY" }, "*");
      })
      .catch((error) => {
        console.error("Error setting up eye tracking:", error);
        window.postMessage(
          { type: "EYE_TRACKING_ERROR", error: error.message },
          "*"
        );
      });
  } else if (!window.eyeTrackingInitialized) {
    console.error("WebGazer not available for eye tracking setup");
    window.postMessage(
      { type: "EYE_TRACKING_ERROR", error: "WebGazer not loaded" },
      "*"
    );
  }
}

setupEyeTracking();
