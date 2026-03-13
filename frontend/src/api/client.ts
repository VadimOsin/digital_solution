import { requestQueue } from "./requestQueue";

export type Item = {
  id: number;
};

export type PaneType = "left" | "right";

export type ItemsResponse = {
  items: Item[];
  total: number;
};

const DEFAULT_LIMIT = 20;

export function fetchItems(pane: PaneType, filter: string, offset: number, limit = DEFAULT_LIMIT) {
  return requestQueue.getData({
    method: "get",
    url: "/api/items",
    params: {
      pane,
      filter: filter.trim(),
      offset,
      limit,
    },
  }) as Promise<ItemsResponse>;
}

export function addItems(ids: number[]) {
  return requestQueue.addItems({
    method: "post",
    url: "/api/items/add",
    data: { ids },
  }) as Promise<{ added: number[] } | null>;
}

export type SelectionBatchPayload = {
  addIds?: number[];
  removeIds?: number[];
  order?: number[];
};

export function applySelectionBatch(payload: SelectionBatchPayload) {
  return requestQueue.mutateSelection({
    method: "post",
    url: "/api/selection/batch",
    data: payload,
  }) as Promise<{ selected: number[] } | null>;
}

export function fetchSelection() {
  return requestQueue.getData({
    method: "get",
    url: "/api/selection",
  }) as Promise<{ selected: number[] }>;
}

