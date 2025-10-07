// Background service worker for Eye-Controlled Scrolling Extension
class BackgroundManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupInstallHandler();
        this.setupMessageHandler();
        this.setupTabUpdateHandler();
    }

    setupInstallHandler() {
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                console.log('Eye-Controlled Scrolling Extension installed');
                this.initializeDefaultSettings();
            } else if (details.reason === 'update') {
                console.log('Eye-Controlled Scrolling Extension updated');
            }
        });
    }

    async initializeDefaultSettings() {
        const defaultSettings = {
            autoScroll: false,
            singleBlink: false,
            doubleBlink: false,
            gazeSensitivity: 5,
            blinkSensitivity: 5
        };

        const defaultStats = {
            blinkCount: 0,
            scrollCount: 0,
            sessionStartTime: Date.now()
        };

        try {
            await chrome.storage.sync.set({
                eyeControlSettings: defaultSettings,
                eyeControlStats: defaultStats
            });
            console.log('Default settings initialized');
        } catch (error) {
            console.error('Error initializing default settings:', error);
        }
    }

    setupMessageHandler() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.type) {
                case 'GET_SETTINGS':
                    this.handleGetSettings(sendResponse);
                    return true; // Keep message channel open for async response

                case 'UPDATE_STATS':
                    this.handleUpdateStats(message.stats);
                    break;

                case 'NAVIGATE_BACK':
                    this.handleNavigateBack(sender.tab.id);
                    break;

                case 'LOG_EVENT':
                    console.log(`Eye Control Event: ${message.event}`, message.data);
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        });
    }

    setupTabUpdateHandler() {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                // Notify content script that page is ready
                chrome.tabs.sendMessage(tabId, {
                    type: 'PAGE_READY'
                }).catch(() => {
                    // Ignore errors if content script not loaded
                });
            }
        });
    }

    async handleGetSettings(sendResponse) {
        try {
            const result = await chrome.storage.sync.get('eyeControlSettings');
            sendResponse({ settings: result.eyeControlSettings || {} });
        } catch (error) {
            console.error('Error getting settings:', error);
            sendResponse({ error: error.message });
        }
    }

    async handleUpdateStats(newStats) {
        try {
            const result = await chrome.storage.sync.get('eyeControlStats');
            const currentStats = result.eyeControlStats || {
                blinkCount: 0,
                scrollCount: 0,
                sessionStartTime: Date.now()
            };

            const updatedStats = {
                ...currentStats,
                ...newStats
            };

            await chrome.storage.sync.set({ eyeControlStats: updatedStats });
            
            // Notify popup if it's open
            chrome.runtime.sendMessage({
                type: 'STATS_UPDATED',
                stats: updatedStats
            }).catch(() => {
                // Ignore errors if popup not open
            });

        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async handleNavigateBack(tabId) {
        try {
            await chrome.tabs.goBack(tabId);
            console.log('Navigated back successfully');
            
            // Update stats
            this.handleUpdateStats({ 
                navigationCount: (await this.getCurrentStats()).navigationCount + 1 || 1 
            });
        } catch (error) {
            console.error('Error navigating back:', error);
        }
    }

    async getCurrentStats() {
        try {
            const result = await chrome.storage.sync.get('eyeControlStats');
            return result.eyeControlStats || {};
        } catch (error) {
            console.error('Error getting current stats:', error);
            return {};
        }
    }

    // Handle extension icon click
    setupActionHandler() {
        chrome.action.onClicked.addListener((tab) => {
            // This will open the popup automatically due to manifest configuration
            console.log('Extension icon clicked');
        });
    }
}

// Initialize background manager
new BackgroundManager();