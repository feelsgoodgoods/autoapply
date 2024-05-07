// popup.js 
document.getElementById('fillForms').addEventListener('click', () => {
  const userMessage = document.getElementById('messageInput').value;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "fillForms", userMessage: userMessage }, function (response) {
      if (chrome.runtime.lastError) {
        console.error("Could not send message to content script:", chrome.runtime.lastError.message);
        alert("Please reload the page for the extension to work.");
      } else {
        // Handle successful response
        console.log("Response from content script:", response);
      }
    });
  });
});

document.getElementById('uploadPost').addEventListener('click', () => {
  const userMessage = document.getElementById('postInput').value;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "uploadPost",
      userMessage: userMessage
    }, function (response) {
      if (chrome.runtime.lastError) {
        console.error("Could not send message to content script:", chrome.runtime.lastError.message);
        alert("Please reload the page for the extension to work.");
      } else {
        // Handle successful response
        console.log("Response from content script:", response);
      }
    });
  });
});
