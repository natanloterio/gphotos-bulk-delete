const test = require("node:test");
const assert = require("node:assert/strict");
const {
  runSelection,
  SELECTION_STATUS,
} = require("../content/selection-loop.js");

const noSleep = () => Promise.resolve();

// A virtualised grid: only `viewport` items around the scroll offset exist.
function createFakeGrid({ total, viewport = 10, loadDelayRounds = 0 }) {
  const checked = new Set();
  const clicks = [];
  let offset = 0;
  let roundsUntilLoaded = loadDelayRounds;

  const page = {
    visibleItems() {
      if (roundsUntilLoaded > 0) {
        roundsUntilLoaded -= 1;
        return [];
      }
      const end = Math.min(offset + viewport, total);
      const items = [];
      for (let index = offset; index < end; index += 1) {
        items.push({
          key: `photo-${index}`,
          checked: checked.has(index),
          select() {
            clicks.push(index);
            checked.add(index);
          },
        });
      }
      return items;
    },
    scrollStep() {
      offset = Math.min(offset + Math.floor(viewport * 0.8), Math.max(total - viewport, 0));
    },
    atBottom() {
      return offset + viewport >= total;
    },
  };

  return { page, checked, clicks };
}

test("selects every item in a library larger than the viewport", async () => {
  const grid = createFakeGrid({ total: 137 });
  const result = await runSelection(grid.page, {}, { sleep: noSleep });

  assert.equal(result.status, SELECTION_STATUS.DONE);
  assert.equal(result.count, 137);
  assert.equal(grid.checked.size, 137);
});

test("never clicks an item twice", async () => {
  const grid = createFakeGrid({ total: 60 });
  await runSelection(grid.page, {}, { sleep: noSleep });

  assert.equal(grid.clicks.length, new Set(grid.clicks).size);
});

test("counts items that were already selected without clicking them", async () => {
  const grid = createFakeGrid({ total: 20 });
  grid.checked.add(0);
  grid.checked.add(5);
  const result = await runSelection(grid.page, {}, { sleep: noSleep });

  assert.equal(result.count, 20);
  assert.equal(grid.clicks.length, 18);
});

test("stops at the item cap", async () => {
  const grid = createFakeGrid({ total: 100 });
  const result = await runSelection(grid.page, { maxItems: 25 }, { sleep: noSleep });

  assert.equal(result.status, SELECTION_STATUS.CAPPED);
  assert.equal(result.count, 25);
  assert.equal(grid.checked.size, 25);
});

test("stops when asked and leaves the selection in place", async () => {
  const grid = createFakeGrid({ total: 100 });
  let rounds = 0;
  const result = await runSelection(
    grid.page,
    {},
    { sleep: noSleep, shouldStop: () => (rounds += 1) > 15 }
  );

  assert.equal(result.status, SELECTION_STATUS.STOPPED);
  assert.ok(result.count > 0 && result.count < 100);
  assert.equal(grid.checked.size, result.count);
});

test("waits for a viewport that has not rendered yet", async () => {
  const grid = createFakeGrid({ total: 30, loadDelayRounds: 4 });
  const result = await runSelection(grid.page, {}, { sleep: noSleep });

  assert.equal(result.status, SELECTION_STATUS.DONE);
  assert.equal(result.count, 30);
});

test("finishes with zero on an empty library", async () => {
  const grid = createFakeGrid({ total: 0 });
  const result = await runSelection(grid.page, {}, { sleep: noSleep });

  assert.equal(result.status, SELECTION_STATUS.DONE);
  assert.equal(result.count, 0);
});

test("reports progress as the count grows", async () => {
  const grid = createFakeGrid({ total: 40 });
  const seen = [];
  await runSelection(grid.page, {}, { sleep: noSleep, onProgress: (n) => seen.push(n) });

  assert.equal(seen.at(-1), 40);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
});
