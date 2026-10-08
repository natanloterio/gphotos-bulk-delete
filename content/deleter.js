// Sends the current selection to the bin: clicks the page's delete button,
// then the confirmation in the dialog that follows.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.GPBD = { ...(root.GPBD || {}), ...api };
  }
})(globalThis, function () {
  const DELETE_DEFAULTS = Object.freeze({
    confirmTimeoutMs: 10000,
    pollMs: 200,
  });

  async function waitFor(find, timeoutMs, pollMs, sleep) {
    for (let waited = 0; waited <= timeoutMs; waited += pollMs) {
      const found = find();
      if (found) {
        return found;
      }
      await sleep(pollMs);
    }
    return null;
  }

  async function moveSelectionToBin(page, options = {}, hooks = {}) {
    const config = { ...DELETE_DEFAULTS, ...options };
    const sleep = hooks.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));

    const deleteButton = page.findDeleteButton();
    if (!deleteButton) {
      throw new Error(
        "Could not find the page's delete button. Your selection is intact: click the bin icon at the top of the page yourself."
      );
    }
    deleteButton.click();

    const confirmButton = await waitFor(
      () => page.findConfirmButton(),
      config.confirmTimeoutMs,
      config.pollMs,
      sleep
    );
    if (!confirmButton) {
      throw new Error(
        "The delete dialog did not show a button I recognise. Your selection is intact: confirm in the dialog yourself."
      );
    }
    confirmButton.click();
  }

  return { moveSelectionToBin, DELETE_DEFAULTS };
});
