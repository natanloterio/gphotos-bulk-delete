// Firefox exposes `browser`, Chrome only `chrome`; both return promises in MV3.
const api = globalThis.browser ?? globalThis.chrome;

const PHOTOS_URL = "https://photos.google.com/";
const TOGGLE_PANEL = "gpbd:toggle-panel";

// tab.url is only visible for hosts we have permission for, so an undefined
// url means "not a Google Photos tab".
function isPhotosTab(tab) {
  return typeof tab.url === "string" && tab.url.startsWith(PHOTOS_URL);
}

async function onActionClicked(tab) {
  if (!isPhotosTab(tab)) {
    await api.tabs.create({ url: PHOTOS_URL });
    return;
  }
  try {
    await api.tabs.sendMessage(tab.id, { type: TOGGLE_PANEL });
  } catch (error) {
    // The tab was open before the extension loaded, so it has no content
    // script yet. Reloading injects it.
    console.warn("Panel not reachable, reloading tab:", error);
    await api.tabs.reload(tab.id);
  }
}

api.action.onClicked.addListener((tab) => {
  onActionClicked(tab).catch((error) => {
    console.error("Google Photos Bulk Delete failed to open:", error);
  });
});
