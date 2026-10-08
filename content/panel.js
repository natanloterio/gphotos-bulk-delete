// On-page control panel: Start / Stop, dry run, and the confirmation step
// before anything is sent to the bin.
(function (root) {
  const { runSelection, moveSelectionToBin, pageAdapter, SELECTION_STATUS } =
    root.GPBD;

  const TOGGLE_PANEL = "gpbd:toggle-panel";
  const HOST_ID = "gpbd-panel-host";

  const PANEL_CSS = `
    :host { all: initial; }
    .panel {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      width: 300px; padding: 14px; border-radius: 10px;
      background: #202124; color: #e8eaed;
      font: 13px/1.4 system-ui, sans-serif;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
    }
    .panel[hidden] { display: none; }
    h1 { margin: 0 0 8px; font-size: 14px; }
    .status { margin: 0 0 4px; }
    .count { margin: 0 0 10px; font-size: 20px; font-weight: 600; }
    label { display: block; margin: 0 0 8px; }
    input[type="number"] {
      width: 90px; margin-left: 6px; padding: 2px 4px;
      background: #303134; color: inherit; border: 1px solid #5f6368;
      border-radius: 4px;
    }
    .row { display: flex; gap: 8px; flex-wrap: wrap; }
    button {
      padding: 6px 12px; border: 0; border-radius: 6px; cursor: pointer;
      background: #8ab4f8; color: #202124; font: inherit; font-weight: 600;
    }
    button.secondary { background: #3c4043; color: #e8eaed; }
    button.danger { background: #f28b82; }
    button[hidden] { display: none; }
    button:disabled { opacity: 0.5; cursor: default; }
  `;

  function el(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  function buildView() {
    const status = el("p", { className: "status", textContent: "Ready." });
    const count = el("p", { className: "count", textContent: "0 selected" });
    const dryRun = el("input", { type: "checkbox" });
    const maxItems = el("input", { type: "number", min: "1", placeholder: "no limit" });
    const start = el("button", { textContent: "Start" });
    const stop = el("button", { className: "secondary", textContent: "Stop", hidden: true });
    const confirm = el("button", { className: "danger", hidden: true });
    const cancel = el("button", { className: "secondary", textContent: "Cancel", hidden: true });

    const panel = el("div", { className: "panel", hidden: true }, [
      el("h1", { textContent: "Google Photos Bulk Delete" }),
      status,
      count,
      el("label", {}, [dryRun, " Select only (dry run, never deletes)"]),
      el("label", {}, ["Max items per pass", maxItems]),
      el("div", { className: "row" }, [start, stop, confirm, cancel]),
    ]);

    return { panel, status, count, dryRun, maxItems, start, stop, confirm, cancel };
  }

  function mount(view) {
    const host = el("div", { id: HOST_ID });
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.append(el("style", { textContent: PANEL_CSS }), view.panel);
    document.documentElement.append(host);
  }

  function readMaxItems(input) {
    const value = Number.parseInt(input.value, 10);
    return Number.isFinite(value) && value > 0 ? value : Infinity;
  }

  function createController(view) {
    let stopRequested = false;

    function show(phase, statusText) {
      const running = phase === "selecting" || phase === "deleting";
      const confirming = phase === "confirming";
      view.status.textContent = statusText;
      view.start.hidden = running || confirming;
      view.stop.hidden = phase !== "selecting";
      view.confirm.hidden = !confirming;
      view.cancel.hidden = !confirming;
      view.dryRun.disabled = running || confirming;
      view.maxItems.disabled = running || confirming;
    }

    function setCount(count) {
      view.count.textContent = `${count} selected`;
    }

    function describeEnd(result, dryRun) {
      if (result.status === SELECTION_STATUS.STOPPED) {
        return "Stopped. Your selection was left as it is.";
      }
      if (dryRun) {
        return "Dry run finished. Nothing was deleted. Compare the count with the page's own counter.";
      }
      return null;
    }

    async function onStart() {
      stopRequested = false;
      const dryRun = view.dryRun.checked;
      setCount(0);
      show("selecting", "Selecting: scrolling through your library…");
      try {
        const result = await runSelection(
          pageAdapter,
          { maxItems: readMaxItems(view.maxItems) },
          { shouldStop: () => stopRequested, onProgress: setCount }
        );
        const endText = describeEnd(result, dryRun);
        if (endText) {
          show("idle", endText);
          return;
        }
        if (result.count === 0) {
          show("idle", "No photos found to select. Open your Photos library and try again.");
          return;
        }
        const capped = result.status === SELECTION_STATUS.CAPPED;
        view.confirm.textContent = `Move ${result.count} to bin`;
        show(
          "confirming",
          capped
            ? "Limit reached. Move this batch to the bin? Run again afterwards for the rest."
            : "Reached the end of the library. Move everything selected to the bin?"
        );
      } catch (error) {
        console.error("Google Photos Bulk Delete: selection failed", error);
        show("idle", `Selection failed: ${error.message}`);
      }
    }

    async function onConfirm() {
      show("deleting", "Sending the selection to the bin…");
      try {
        await moveSelectionToBin(pageAdapter);
        show(
          "idle",
          "Delete confirmed on the page. Items stay in the bin for 60 days before Google removes them."
        );
      } catch (error) {
        console.error("Google Photos Bulk Delete: delete failed", error);
        show("idle", error.message);
      }
    }

    view.start.addEventListener("click", onStart);
    view.stop.addEventListener("click", () => {
      stopRequested = true;
    });
    view.confirm.addEventListener("click", onConfirm);
    view.cancel.addEventListener("click", () => {
      show("idle", "Cancelled. Nothing was deleted; your selection is still active.");
    });
  }

  function init() {
    if (document.getElementById(HOST_ID)) {
      return;
    }
    const view = buildView();
    mount(view);
    createController(view);
    browser.runtime.onMessage.addListener((message) => {
      if (message && message.type === TOGGLE_PANEL) {
        view.panel.hidden = !view.panel.hidden;
      }
    });
  }

  init();
})(globalThis);
