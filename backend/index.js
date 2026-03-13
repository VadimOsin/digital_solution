import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory data
const MAX_INITIAL_ID = 1_000_000;
const allItems = new Set();
for (let i = 1; i <= MAX_INITIAL_ID; i += 1) {
  allItems.add(i);
}

let selectedOrder = [];
let selectedSet = new Set();

function filterAndSliceIds({ source, filter, offset, limit }) {
  const filterStr = (filter ?? "").trim();
  const result = [];
  let skipped = 0;

  for (const id of source) {
    if (filterStr && !id.toString().includes(filterStr)) continue;
    if (skipped < offset) {
      skipped += 1;
      continue;
    }
    result.push(id);
    if (result.length >= limit) break;
  }

  return result;
}

// Get items for left/right pane with filtering and pagination
app.get("/api/items", (req, res) => {
  const pane = req.query.pane === "right" ? "right" : "left";
  const filter = req.query.filter ?? "";
  const offset = Number.parseInt(req.query.offset ?? "0", 10) || 0;
  const limit = Number.parseInt(req.query.limit ?? "20", 10) || 20;

  let sourceIterable;

  if (pane === "right") {
    // Right pane: selected items in current order
    sourceIterable = selectedOrder.values();
  } else {
    // Left pane: all items except selected, sorted by id asc
    const leftIds = [];
    for (const id of allItems) {
      if (!selectedSet.has(id)) leftIds.push(id);
    }
    leftIds.sort((a, b) => a - b);
    sourceIterable = leftIds.values();
  }

  const ids = filterAndSliceIds({
    source: sourceIterable,
    filter,
    offset,
    limit,
  });

  res.json({
    items: ids.map((id) => ({ id })),
    total: pane === "right" ? selectedOrder.length : allItems.size - selectedSet.size,
  });
});

// Batch add items (new IDs)
app.post("/api/items/add", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const added = [];

  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (allItems.has(id)) continue; // dedupe on server
    allItems.add(id);
    added.push(id);
  }

  res.json({ added });
});

// Batch selection operations: add/remove/reorder
app.post("/api/selection/batch", (req, res) => {
  const addIds = Array.isArray(req.body?.addIds) ? req.body.addIds : [];
  const removeIds = Array.isArray(req.body?.removeIds) ? req.body.removeIds : [];
  const newOrder = Array.isArray(req.body?.order) ? req.body.order : null;

  // Add to selection (append to end)
  for (const raw of addIds) {
    const id = Number(raw);
    if (!Number.isInteger(id)) continue;
    if (!allItems.has(id)) continue;
    if (selectedSet.has(id)) continue;
    selectedSet.add(id);
    selectedOrder.push(id);
  }

  // Remove from selection
  if (removeIds.length > 0) {
    const toRemove = new Set(
      removeIds
        .map((raw) => Number(raw))
        .filter((id) => Number.isInteger(id) && selectedSet.has(id)),
    );

    if (toRemove.size > 0) {
      selectedOrder = selectedOrder.filter((id) => !toRemove.has(id));
      selectedSet = new Set(selectedOrder);
    }
  }

  // Reorder selection (Drag&Drop)
  if (newOrder && Array.isArray(newOrder)) {
    const validIds = newOrder
      .map((raw) => Number(raw))
      .filter((id) => Number.isInteger(id) && selectedSet.has(id));

    if (validIds.length === selectedOrder.length) {
      selectedOrder = validIds;
      selectedSet = new Set(selectedOrder);
    }
  }

  res.json({ selected: selectedOrder });
});

// Get current selection (for initial load / debug)
app.get("/api/selection", (_req, res) => {
  res.json({ selected: selectedOrder });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

