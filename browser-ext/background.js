chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sendToNetPull",
    title: "Download with NetPull",
    contexts: ["page", "link", "image", "video", "audio"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sendToNetPull") {
    const url = info.linkUrl || info.srcUrl || info.pageUrl || tab.url;
    if (url) {
      sendToNetPull(url);
    }
  }
});

async function sendToNetPull(url) {
  try {
    const response = await fetch("http://localhost:8000/downloads/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        protocol_type: "http" // Default to http, daemon can auto-detect later
      })
    });
    const result = await response.json();
    console.log("NetPull response:", result);
  } catch (error) {
    console.error("Failed to send link to NetPull:", error);
  }
}
