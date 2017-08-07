// chrome extension init
var cepath = chrome.i18n.getMessage("@@extension_id");
var src = 'chrome-extension://"+cepath+"/images/monotone_close_exit_delete_small.png'
    // chrome.runtime.sendMessage({query: "set", selected_profile: val}, function(response) { return; });

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.text === 'report_back') {
        // Call the specified callback, passing
        // the web-page's DOM content as argument
        sendResponse(document.documentElement.outerHTML);
    }
});