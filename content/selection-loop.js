// Scroll-and-select logic. It knows nothing about the DOM: it drives a `page`
// adapter (see selectors.js), which keeps it testable against a fake grid.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.GPBD = { ...(root.GPBD || {}), ...api };
  }
})(globalThis, function () {
  const SELECTION_DEFAULTS = Object.freeze({
    // Pause after each scroll so the grid can render the next photos.
    settleMs: 700,
    // Rounds at the bottom with nothing new before the library counts as done.
    idleRoundsToFinish: 5,
    // Rounds to wait on a viewport that has not rendered any photo yet.
    emptyViewportRetries: 10,
    maxItems: Infinity,
  });

  const SELECTION_STATUS = Object.freeze({
    DONE: "done",
    STOPPED: "stopped",
    CAPPED: "capped",
  });

  // Selects every unselected item in view. Returns how many it clicked and
  // whether the cap was hit before the viewport was exhausted.
  function selectVisible(items, seenKeys, maxItems, shouldStop) {
    let clicked = 0;
    for (const item of items) {
      if (shouldStop()) {
        break;
      }
      if (!item.checked) {
        if (seenKeys.size >= maxItems && !seenKeys.has(item.key)) {
          return { clicked, capped: true };
        }
        item.select();
        clicked += 1;
      }
      seenKeys.add(item.key);
    }
    return { clicked, capped: false };
  }

  async function runSelection(page, options = {}, hooks = {}) {
    const config = { ...SELECTION_DEFAULTS, ...options };
    const shouldStop = hooks.shouldStop || (() => false);
    const onProgress = hooks.onProgress || (() => {});
    const sleep = hooks.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));

    const seenKeys = new Set();
    let idleRounds = 0;
    let emptyRounds = 0;

    while (!shouldStop()) {
      const items = page.visibleItems();
      const { clicked, capped } = selectVisible(
        items,
        seenKeys,
        config.maxItems,
        shouldStop
      );
      onProgress(seenKeys.size);

      if (capped) {
        return { status: SELECTION_STATUS.CAPPED, count: seenKeys.size };
      }

      const stillLoading =
        items.length === 0 && emptyRounds < config.emptyViewportRetries;
      if (stillLoading) {
        emptyRounds += 1;
      } else if (page.atBottom()) {
        idleRounds = clicked === 0 ? idleRounds + 1 : 0;
        if (idleRounds >= config.idleRoundsToFinish) {
          return { status: SELECTION_STATUS.DONE, count: seenKeys.size };
        }
      } else {
        emptyRounds = 0;
        idleRounds = 0;
        page.scrollStep();
      }

      await sleep(config.settleMs);
    }

    return { status: SELECTION_STATUS.STOPPED, count: seenKeys.size };
  }

  return { runSelection, SELECTION_DEFAULTS, SELECTION_STATUS };
});
