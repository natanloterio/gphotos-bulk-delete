const test = require("node:test");
const assert = require("node:assert/strict");
const { moveSelectionToBin } = require("../content/deleter.js");

const noSleep = () => Promise.resolve();
const fastOptions = { confirmTimeoutMs: 50, pollMs: 10 };

function createButton(log, name) {
  return { click: () => log.push(name) };
}

test("clicks delete, then the confirmation once it appears", async () => {
  const log = [];
  let polls = 0;
  const page = {
    findDeleteButton: () => createButton(log, "delete"),
    findConfirmButton: () => ((polls += 1) >= 3 ? createButton(log, "confirm") : null),
  };

  await moveSelectionToBin(page, fastOptions, { sleep: noSleep });

  assert.deepEqual(log, ["delete", "confirm"]);
});

test("fails without clicking anything when the delete button is missing", async () => {
  const log = [];
  const page = {
    findDeleteButton: () => null,
    findConfirmButton: () => createButton(log, "confirm"),
  };

  await assert.rejects(
    moveSelectionToBin(page, fastOptions, { sleep: noSleep }),
    /delete button/
  );
  assert.deepEqual(log, []);
});

test("fails when the confirmation never appears", async () => {
  const log = [];
  const page = {
    findDeleteButton: () => createButton(log, "delete"),
    findConfirmButton: () => null,
  };

  await assert.rejects(
    moveSelectionToBin(page, fastOptions, { sleep: noSleep }),
    /delete dialog/
  );
  assert.deepEqual(log, ["delete"]);
});
