# sn-list-sorter

A Supernote plugin that sorts a recognized or typed list alphabetically and inserts it back onto the page with your choice of formatting. Handwritten items must be converted to text using **Recognize as Text** before the plugin can read them.

---

## Requirements

- Supernote Nomad or Manta running **Chauvet 3.15.27** or later
- The `.snplg` file transferred to your device and installed

---

## How to Use

### Step 1 — Recognize your handwriting as text

The plugin works on text the device has already recognized, not raw ink strokes.

1. Write your list items on the page (one item per line works best)
2. Lasso the handwritten items
3. Tap **Recognize as Text** in the lasso menu

The device will convert your ink to typed text in place. You will see the items redisplayed as a text block.

### Step 2 — Sort and format

1. Lasso the recognized text block (or blocks)
2. Tap the **List Sorter** plugin button in the lasso menu
3. The plugin reads the items, sorts them alphabetically, and shows the **Sort Panel**
4. Configure your options (see below)
5. Tap **Insert Sorted** — the sorted list appears on the page below your original selection

---

## Sort Options

### Format
Adds a prefix to each item in the sorted list.

| Option | Example |
|--------|---------|
| None | Item |
| Bullet | • Item |
| Checkbox | ☐ Item |
| Numbered | 1. Item |
| Lettered | A. Item |

### Alignment
Sets the text alignment within each box: **Left**, **Center**, or **Right**.

### Font Size
Choose from **24, 28, 32, 36, or 40** pt.

### Style
Toggle **Bold** on or off.

### Insert As

This is the most important setting. It controls how the sorted list is written to the page.

#### Single box
All items are placed in one multi-line text box.

- Enables **H (Highlight/Title)** — lasso the box and tap H to add it to the Navigation panel as a title or keyword
- Enables **New Event** and **New Task** from the lasso menu
- The whole list moves and resizes together
- Use **Format Group** later to change font size or bold

#### Individual items
Each item gets its own text box, stacked vertically.

- Each item can be moved independently
- Use **Realign** to snap all items back to the same left edge with consistent spacing after moving them around
- Use **Format Group** to resize or restyle all items at once
- Does not support H highlight, New Event, or New Task on the group as a whole

> **Tip:** If you want native Supernote features like events, tasks, or Navigation panel entries, choose **Single box**. If you want to rearrange individual items after inserting, choose **Individual items**.

---

## Group Actions

Once a sorted list is on the page, lasso any item in the group and tap the **List Sorter** plugin button. The plugin detects that it created those elements and shows the **Group Panel** instead of the Sort Panel.

### Realign
Snaps all items in the group to the same left edge and restores even vertical spacing. Useful after you have moved individual items around and want to tidy them up.

*Only available for Individual items output.*

### Format Group
Changes the font size and bold setting for every item in the group at once, and repositions them with the correct spacing for the new size.

1. Tap **Format Group** to expand the options
2. Choose a font size and toggle bold
3. Tap **Apply Format**

---

## Tips

- **Original list stays on the page.** The plugin inserts the sorted list as new elements; it does not delete your original recognized text. Delete or move the original manually once you are happy with the result.
- **Undo.** Use the back arrow (undo) if an insert does not look right. The plugin writes elements in a single operation so one undo removes the whole list.
- **Borders and backgrounds.** The SDK does not currently support filled backgrounds on text boxes. If you want to visually separate a list from page lines, consider moving it to a blank area of the page.
- **Writing on top of an H-highlighted list.** Once a single-box list is highlighted with H, the pen input is captured by the text box. This is a platform behavior, not a plugin limitation.
