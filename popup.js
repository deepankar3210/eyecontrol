// Extension popup functionality
class PopupManager {
    constructor() {
        this.settings = {
            autoScroll: false,
            singleBlink: false,
            doubleBlink: false,
            gazeSensitivity: 5,
            blinkSensitivity: 5
        };
        this.stats = {
            blinkCount: 0,
            scrollCount: 0,
            sessionStartTime: Date.now()
        };
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadStats();
        this.setupEventListeners();
        this.updateUI();
        this.startSessionTimer();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get('eyeControlSettings');
            if (result.eyeControlSettings) {
                this.settings = { ...this.settings, ...result.eyeControlSettings };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadStats() {
        try {
            const result = await chrome.storage.sync.get('eyeControlStats');
            if (result.eyeControlStats) {
                this.stats = { ...this.stats, ...result.eyeControlStats };
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ eyeControlSettings: this.settings });
            
            // Notify content script of settings change
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SETTINGS_UPDATE',
                    settings: this.settings
                }).catch(() => {
                    // Ignore errors if content script not loaded
                });
            }
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async saveStats() {
        try {
            await chrome.storage.sync.set({ eyeControlStats: this.stats });
        } catch (error) {
            console.error('Error saving stats:', error);
        }
    }

    setupEventListeners() {
        // Feature toggles
        document.getElementById('auto-scroll-toggle').addEventListener('change', (e) => {
            this.settings.autoScroll = e.target.checked;
            this.saveSettings();
            this.updateStatus();
        });

        document.getElementById('single-blink-toggle').addEventListener('change', (e) => {
            this.settings.singleBlink = e.target.checked;
            this.saveSettings();
            this.updateStatus();
        });

        document.getElementById('double-blink-toggle').addEventListener('change', (e) => {
            this.settings.doubleBlink = e.target.checked;
            this.saveSettings();
            this.updateStatus();
        });

        // Sensitivity sliders
        document.getElementById('gaze-sensitivity').addEventListener('input', (e) => {
            this.settings.gazeSensitivity = parseInt(e.target.value);
            document.getElementById('gaze-sensitivity-value').textContent = e.target.value;
            this.saveSettings();
        });

        document.getElementById('blink-sensitivity').addEventListener('input', (e) => {
            this.settings.blinkSensitivity = parseInt(e.target.value);
            document.getElementById('blink-sensitivity-value').textContent = e.target.value;
            this.saveSettings();
        });

        // Action buttons
        document.getElementById('calibrate-btn').addEventListener('click', () => {
            this.startCalibration();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetToDefault();
        });
    }

    updateUI() {
        // Update toggles
        document.getElementById('auto-scroll-toggle').checked = this.settings.autoScroll;
        document.getElementById('single-blink-toggle').checked = this.settings.singleBlink;
        document.getElementById('double-blink-toggle').checked = this.settings.doubleBlink;

        // Update sliders
        document.getElementById('gaze-sensitivity').value = this.settings.gazeSensitivity;
        document.getElementById('gaze-sensitivity-value').textContent = this.settings.gazeSensitivity;
        document.getElementById('blink-sensitivity').value = this.settings.blinkSensitivity;
        document.getElementById('blink-sensitivity-value').textContent = this.settings.blinkSensitivity;

        // Update stats
        document.getElementById('blink-count').textContent = this.stats.blinkCount;
        document.getElementById('scroll-count').textContent = this.stats.scrollCount;

        this.updateStatus();
    }

    updateStatus() {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        const isActive = this.settings.autoScroll || this.settings.singleBlink || this.settings.doubleBlink;
        
        if (isActive) {
            statusDot.classList.add('active');
            statusText.textContent = 'Active';
        } else {
            statusDot.classList.remove('active');
            statusText.textContent = 'Inactive';
        }
    }

    startSessionTimer() {
        setInterval(() => {
            const sessionTime = Math.floor((Date.now() - this.stats.sessionStartTime) / 60000);
            document.getElementById('session-time').textContent = `${sessionTime}m`;
        }, 1000);
    }

    async startCalibration() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'START_CALIBRATION'
                });
                
                // Show calibration feedback
                const calibrateBtn = document.getElementById('calibrate-btn');
                const originalText = calibrateBtn.innerHTML;
                calibrateBtn.innerHTML = '<span class="btn-icon">⏳</span>Calibrating...';
                calibrateBtn.disabled = true;
                
                setTimeout(() => {
                    calibrateBtn.innerHTML = originalText;
                    calibrateBtn.disabled = false;
                }, 5000);
            }
        } catch (error) {
            console.error('Error starting calibration:', error);
        }
    }

    resetToDefault() {
        this.settings = {
            autoScroll: false,
            singleBlink: false,
            doubleBlink: false,
            gazeSensitivity: 5,
            blinkSensitivity: 5
        };
        
        this.stats = {
            blinkCount: 0,
            scrollCount: 0,
            sessionStartTime: Date.now()
        };
        
        this.saveSettings();
        this.saveStats();
        this.updateUI();
    }

    // Listen for messages from content script to update stats
    async setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'STATS_UPDATE') {
                this.stats = { ...this.stats, ...message.stats };
                this.saveStats();
                this.updateUI();
            }
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});