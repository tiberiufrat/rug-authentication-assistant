'use strict';

// Open configuration window after installation
chrome.runtime.onInstalled.addListener(({ reason }) => { if (reason === 'install') chrome.tabs.create({ url: 'https://sites.google.com/view/rug-authentication-assistant/#h.yn4h1kab0otd' }); });