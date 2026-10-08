// Everything that depends on Google Photos' markup lives here. When Google
// changes the page and the extension stops working, this is the file to fix.
(function (root) {
  const SELECTORS = Object.freeze({
    // Per-photo tick box. The class is Google's obfuscated name and the most
    // likely thing to change.
    photoCheckbox: 'div[role="checkbox"].ckGgle',
    // Used when the class above matches nothing. Also matches the per-day
    // "select all" boxes, which are filtered out by requiring a photo link.
    anyCheckbox: '[role="checkbox"][aria-checked]',
    photoLink: 'a[href*="/photo/"]',
    dialog: '[role="dialog"], [role="alertdialog"]',
    button: 'button, [role="button"]',
  });

  const DELETE_LABEL = /^(delete|move to (trash|bin))$/i;
  const CONFIRM_LABEL = /^(move to (trash|bin)|delete)$/i;

  const MAX_LINK_ANCESTORS = 4;
  const SCROLL_STEP_RATIO = 0.8;
  const BOTTOM_TOLERANCE_PX = 4;

  function isVisible(element) {
    return element.getClientRects().length > 0;
  }

  // Walks up from a tick box to the tile that holds exactly one photo link.
  function findPhotoLink(checkbox) {
    let node = checkbox.parentElement;
    for (let depth = 0; node && depth < MAX_LINK_ANCESTORS; depth += 1) {
      const links = node.querySelectorAll(SELECTORS.photoLink);
      if (links.length === 1) {
        return links[0];
      }
      if (links.length > 1) {
        return null;
      }
      node = node.parentElement;
    }
    return null;
  }

  function toItem(checkbox, allowLabelKey) {
    const link = findPhotoLink(checkbox);
    const label = checkbox.getAttribute("aria-label");
    const key = link
      ? link.getAttribute("href")
      : allowLabelKey && label
        ? `label:${label}`
        : null;
    if (!key) {
      return null;
    }
    return {
      key,
      checked: checkbox.getAttribute("aria-checked") === "true",
      // Re-read the state at click time so a tick box is never toggled off.
      select() {
        if (checkbox.getAttribute("aria-checked") !== "true") {
          checkbox.click();
        }
      },
    };
  }

  function findCheckboxes() {
    const primary = [...document.querySelectorAll(SELECTORS.photoCheckbox)];
    if (primary.length > 0) {
      return { checkboxes: primary, allowLabelKey: true };
    }
    return {
      checkboxes: [...document.querySelectorAll(SELECTORS.anyCheckbox)],
      allowLabelKey: false,
    };
  }

  function visibleItems() {
    const { checkboxes, allowLabelKey } = findCheckboxes();
    return checkboxes
      .map((checkbox) => toItem(checkbox, allowLabelKey))
      .filter((item) => item !== null);
  }

  function isScrollable(element) {
    const overflowY = getComputedStyle(element).overflowY;
    return (
      (overflowY === "auto" || overflowY === "scroll") &&
      element.scrollHeight > element.clientHeight + BOTTOM_TOLERANCE_PX
    );
  }

  // The photo grid scrolls inside its own container, not the window.
  function findScroller() {
    const { checkboxes } = findCheckboxes();
    let node = checkboxes.length > 0 ? checkboxes[0].parentElement : null;
    while (node && node !== document.documentElement) {
      if (isScrollable(node)) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  }

  function scrollStep() {
    const scroller = findScroller();
    scroller.scrollBy(0, Math.floor(scroller.clientHeight * SCROLL_STEP_RATIO));
  }

  function atBottom() {
    const scroller = findScroller();
    return (
      scroller.scrollTop + scroller.clientHeight >=
      scroller.scrollHeight - BOTTOM_TOLERANCE_PX
    );
  }

  function buttonLabel(button) {
    return (
      button.getAttribute("aria-label") ||
      button.getAttribute("title") ||
      button.textContent ||
      ""
    ).trim();
  }

  function findButton(scope, pattern) {
    return (
      [...scope.querySelectorAll(SELECTORS.button)].find(
        (button) => isVisible(button) && pattern.test(buttonLabel(button))
      ) || null
    );
  }

  function findDeleteButton() {
    return findButton(document, DELETE_LABEL);
  }

  function findConfirmButton() {
    const dialogs = [...document.querySelectorAll(SELECTORS.dialog)].filter(
      isVisible
    );
    for (const dialog of dialogs) {
      const button = findButton(dialog, CONFIRM_LABEL);
      if (button) {
        return button;
      }
    }
    return null;
  }

  const pageAdapter = Object.freeze({
    visibleItems,
    scrollStep,
    atBottom,
    findDeleteButton,
    findConfirmButton,
  });

  root.GPBD = { ...(root.GPBD || {}), pageAdapter };
})(globalThis);
