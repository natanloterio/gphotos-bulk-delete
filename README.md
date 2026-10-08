# Google Photos Bulk Delete

A Firefox extension that selects every photo in your Google Photos library and
moves the whole selection to the bin.

Google's official Photos API cannot delete photos, and the web app has no
"select all" button. This extension does by hand what you would otherwise do
yourself: it scrolls through the library ticking every photo, then presses the
page's own delete button once you confirm.

> **Status: experimental.** The scroll-and-select logic is unit tested, but the
> selectors for Google's page have not been verified against the live site.
> Run the dry run first, and expect to adjust `content/selectors.js`.

## What it does

1. **Selects**: ticks every unselected photo on screen, scrolls down, waits
   for the next photos to load, and repeats.
2. **Detects the end**: stops once it is at the bottom and several rounds in a
   row bring nothing new.
3. **Asks you**: shows how many items are selected and waits for your click.
4. **Deletes**: clicks the page's delete button and its confirmation dialog.

Deleted items go to the Google Photos bin, where Google keeps them for 60 days.
The extension never empties the bin.

**Deleting from Google Photos also removes the photos from devices that sync
with it.** Export anything you want to keep with
[Google Takeout](https://takeout.google.com/) first.

## Install

The extension is not published on addons.mozilla.org. Load it as a temporary
add-on:

1. Clone or download this repository.
2. Open `about:debugging#/runtime/this-firefox` in Firefox 127 or newer.
3. Click **Load Temporary Add-on…** and pick `manifest.json`.

Firefox removes temporary add-ons when it restarts; load it again when needed.

## Use

1. Open <https://photos.google.com/> and stay on the main **Photos** view.
2. Click the extension's toolbar button to show the panel in the bottom right
   corner. If the tab was open before you loaded the add-on, the first click
   reloads the tab; click again.
3. **Dry run first.** Tick **Select only (dry run)** and press **Start**. It
   selects without deleting. When it finishes, compare its count with the
   page's own "N selected" counter.
4. **Real run.** Untick the dry run, press **Start**, wait for it to reach the
   end of the library, then press **Move N to bin**.

Keep the tab in the foreground while it runs, because Firefox throttles
background tabs. **Stop** halts at once and leaves the selection as it is.

### Options

| Option | Effect |
| --- | --- |
| Select only (dry run) | Selects and counts, never deletes. |
| Max items per pass | Stops selecting at this many items. Empty means no limit. Use it if one very large delete fails, then run again until the library is empty. |

## Limitations

- **English UI only for the final step.** The delete and confirm buttons are
  matched by their English labels ("Delete", "Move to bin", "Move to trash").
  In other languages the selection works but you have to click the bin icon
  yourself.
- **Very large libraries are untested.** It is unknown whether Google Photos
  accepts a single delete of tens of thousands of items. Use
  **Max items per pass** if it does not.
- **Google can break it at any time.** The page's markup is not a public
  interface and changes without notice.

## When it stops working

Every selector that depends on Google's markup is in `content/selectors.js`.
That is the only file that should need updating:

| Symptom in a dry run | Likely cause |
| --- | --- |
| Count stays at 0 | The photo checkbox selector no longer matches. |
| Count is lower than the page's | Photos load slower than the scroll; raise `settleMs` in `content/selection-loop.js`. |
| Never finishes, or finishes early | The scroll container is detected wrongly. |

## Permissions and privacy

The extension requests access to `https://photos.google.com/*` and nothing
else. It makes no network requests of its own, collects no data, and has no
dependencies.

## Project layout

```
manifest.json                Manifest V3, Firefox
background.js                Toolbar button: toggles the panel
content/selection-loop.js    Scroll-and-select logic, DOM-free
content/deleter.js           Delete button + confirmation sequence
content/selectors.js         All Google Photos selectors and DOM access
content/panel.js             On-page control panel
test/                        Unit tests (node:test)
```

## Development

```
node --test
```

The tests run the selection loop and the delete sequence against fakes. They
do not exercise the real Google Photos page.

## Disclaimer

This project is not affiliated with or endorsed by Google. It automates
clicks in your own logged-in session; use it at your own risk and only on your
own account.

## License

[MIT](LICENSE)
