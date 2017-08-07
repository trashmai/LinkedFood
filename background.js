// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
    // If the letter 'g' is found in the tab's URL...
    if (tab.url.indexOf('icook.tw')) {
        // ... show the page action.
        chrome.pageAction.show(tabId);
    }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);

/*
var selected_profile = 'rk';

chrome.runtime.onMessage.addListener(function(message,sender,sendResponse){
  if (message.query == 'get') {
    sendResponse({selected_profile: selected_profile});
  }
  else if (message.query == 'set') {
    selected_profile = message.selected_profile;
  }
  
});
//*/