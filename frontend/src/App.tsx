import { useEffect, useMemo, useState } from "react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  addItems,
  applySelectionBatch,
  fetchItems,
  fetchSelection,
  Item,
} from "./api/client";

type PaneProps = {
  title: string;
  subtitle: string;
  side: "left" | "right";
  items: Item[];
  total: number;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  search: string;
  canScrollMore: boolean;
  loadMore: () => void;
  onToggleSelect: (item: Item) => void;
};

function Pane(props: PaneProps) {
  const {
    title,
    subtitle,
    side,
    items,
    total,
    isLoading,
    onSearchChange,
    search,
    canScrollMore,
    loadMore,
    onToggleSelect,
  } = props;

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    if (!canScrollMore) return;
    const el = e.currentTarget;
    const threshold = 60;
    if (el.scrollTop + el.clientHeight + threshold >= el.scrollHeight) {
      loadMore();
    }
  };

  return (
    <div className="pane">
      <div className="pane-header">
        <div>
          <div className="pane-title">{title}</div>
          <div className="pane-subtitle">{subtitle}</div>
        </div>
        <span className="badge">{total} элементов</span>
      </div>
      <div className="pane-body">
        <input
          className="search-input"
          placeholder="Фильтр по ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="list-container">
          <div className="list-scroll" onScroll={handleScroll}>
            {items.map((item) => (
              <div key={item.id} className="item-row">
                <span className="item-id">ID: {item.id}</span>
                <div className="item-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => onToggleSelect(item)}
                  >
                    {side === "left" ? "Добавить" : "Убрать"}
                  </button>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: 8 }}>
                <div className="loader" />
              </div>
            )}
          </div>
        </div>
        <div className="status-bar">
          <span>
            Показано {items.length} из {total}
          </span>
          {!canScrollMore && <span>Все элементы загружены</span>}
        </div>
      </div>
    </div>
  );
}

function RightPane(props: Omit<PaneProps, "side"> & { onReorder: (ids: number[]) => void }) {
  const {
    title,
    subtitle,
    items,
    total,
    isLoading,
    onSearchChange,
    search,
    canScrollMore,
    loadMore,
    onToggleSelect,
    onReorder,
  } = props;

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    if (!canScrollMore) return;
    const el = e.currentTarget;
    const threshold = 60;
    if (el.scrollTop + el.clientHeight + threshold >= el.scrollHeight) {
      loadMore();
    }
  };

  const visibleIds = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <div className="pane">
      <div className="pane-header">
        <div>
          <div className="pane-title">{title}</div>
          <div className="pane-subtitle">{subtitle}</div>
        </div>
        <span className="badge">{total} выбрано</span>
      </div>
      <div className="pane-body">
        <input
          className="search-input"
          placeholder="Фильтр по ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="list-container">
          <DragDropContext
            onDragEnd={(result: DropResult) => {
              if (!result.destination) return;
              const from = result.source.index;
              const to = result.destination.index;
              if (from === to) return;

              const updated = Array.from(visibleIds);
              const [moved] = updated.splice(from, 1);
              updated.splice(to, 0, moved);

              // Передаём новый порядок только видимых элементов.
              onReorder(updated);
            }}
          >
            <Droppable droppableId="right-pane-droppable">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="list-scroll"
                  onScroll={handleScroll}
                >
                  {items.map((item, index) => (
                    <Draggable
                      key={item.id}
                      draggableId={String(item.id)}
                      index={index}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="item-row"
                        >
                          <span className="item-id">ID: {item.id}</span>
                          <div className="item-actions">
                            <button
                              className="btn btn-outline"
                              onClick={() => onToggleSelect(item)}
                            >
                              Убрать
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {isLoading && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: 8,
                      }}
                    >
                      <div className="loader" />
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
        <div className="status-bar">
          <span>
            Показано {items.length} из {total}
          </span>
          {!canScrollMore && <span>Все элементы загружены</span>}
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [leftItems, setLeftItems] = useState<Item[]>([]);
  const [rightItems, setRightItems] = useState<Item[]>([]);
  const [leftTotal, setLeftTotal] = useState(0);
  const [rightTotal, setRightTotal] = useState(0);

  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");

  const [leftOffset, setLeftOffset] = useState(0);
  const [rightOffset, setRightOffset] = useState(0);

  const [isLeftLoading, setIsLeftLoading] = useState(false);
  const [isRightLoading, setIsRightLoading] = useState(false);

  const [newId, setNewId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const canLoadMoreLeft = leftItems.length < leftTotal;
  const canLoadMoreRight = rightItems.length < rightTotal;

  // Загрузка текущего состояния выбора при старте
  useEffect(() => {
    void fetchSelection().then((data) => {
      setRightTotal(data.selected.length);
      // сами элементы подтянутся через запрос /items
    });
  }, []);

  // загрузка левого списка
  useEffect(() => {
    setIsLeftLoading(true);
    setLeftItems([]);
    setLeftOffset(0);
    void fetchItems("left", leftSearch, 0).then((data) => {
      setLeftItems(data.items);
      setLeftTotal(data.total);
      setLeftOffset(data.items.length);
      setIsLeftLoading(false);
    });
  }, [leftSearch]);

  // загрузка правого списка
  useEffect(() => {
    setIsRightLoading(true);
    setRightItems([]);
    setRightOffset(0);
    void fetchItems("right", rightSearch, 0).then((data) => {
      setRightItems(data.items);
      setRightTotal(data.total);
      setRightOffset(data.items.length);
      setIsRightLoading(false);
    });
  }, [rightSearch]);

  const loadMoreLeft = () => {
    if (!canLoadMoreLeft || isLeftLoading) return;
    setIsLeftLoading(true);
    void fetchItems("left", leftSearch, leftOffset).then((data) => {
      setLeftItems((prev) => [...prev, ...data.items]);
      setLeftOffset((prev) => prev + data.items.length);
      setIsLeftLoading(false);
    });
  };

  const loadMoreRight = () => {
    if (!canLoadMoreRight || isRightLoading) return;
    setIsRightLoading(true);
    void fetchItems("right", rightSearch, rightOffset).then((data) => {
      setRightItems((prev) => [...prev, ...data.items]);
      setRightOffset((prev) => prev + data.items.length);
      setIsRightLoading(false);
    });
  };

  const handleAddNewId = () => {
    const id = Number(newId);
    if (!Number.isInteger(id) || id <= 0) return;
    setIsAdding(true);
    void addItems([id]).finally(() => {
      setIsAdding(false);
      setNewId("");
      // Обновим левый список (с учётом фильтра)
      setLeftItems([]);
      setLeftOffset(0);
      setIsLeftLoading(true);
      void fetchItems("left", leftSearch, 0).then((data) => {
        setLeftItems(data.items);
        setLeftTotal(data.total);
        setLeftOffset(data.items.length);
        setIsLeftLoading(false);
      });
    });
  };

  const toggleSelect = (item: Item, fromSide: "left" | "right") => {
    if (fromSide === "left") {
      void applySelectionBatch({ addIds: [item.id] }).then(() => {
        // локально перенесём элемент вправо
        setRightItems((prev) => [...prev, item]);
        setRightTotal((prev) => prev + 1);
        setLeftItems((prev) => prev.filter((i) => i.id !== item.id));
        setLeftTotal((prev) => (prev > 0 ? prev - 1 : 0));
      });
    } else {
      void applySelectionBatch({ removeIds: [item.id] }).then(() => {
        setRightItems((prev) => prev.filter((i) => i.id !== item.id));
        setRightTotal((prev) => (prev > 0 ? prev - 1 : 0));
        // левый список при следующем запросе подтянет этот ID
      });
    }
  };

  const handleReorderRight = (visibleIds: number[]) => {
    // Обновляем локальный порядок для видимых элементов
    setRightItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      const reorderedVisible = visibleIds.map((id) => map.get(id)).filter(Boolean) as Item[];
      const others = prev.filter((i) => !visibleIds.includes(i.id));
      return [...reorderedVisible, ...others];
    });

    // Отправляем новый порядок (для простоты — всех известных элементов)
    void applySelectionBatch({
      order: rightItems.map((i) => i.id),
    });
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-title">Список 1 000 000 элементов</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="add-form">
            <input
              className="search-input add-input"
              placeholder="Новый ID..."
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={isAdding}
              onClick={handleAddNewId}
            >
              Добавить элемент
            </button>
          </div>
        </div>
      </header>

      <main className="app-layout">
        <Pane
          title="Доступные элементы"
          subtitle="Все элементы кроме выбранных"
          side="left"
          items={leftItems}
          total={leftTotal}
          isLoading={isLeftLoading}
          search={leftSearch}
          onSearchChange={setLeftSearch}
          canScrollMore={canLoadMoreLeft}
          loadMore={loadMoreLeft}
          onToggleSelect={(item) => toggleSelect(item, "left")}
        />
        <RightPane
          title="Выбранные элементы"
          subtitle="Можно сортировать перетаскиванием"
          items={rightItems}
          total={rightTotal}
          isLoading={isRightLoading}
          search={rightSearch}
          onSearchChange={setRightSearch}
          canScrollMore={canLoadMoreRight}
          loadMore={loadMoreRight}
          onToggleSelect={(item) => toggleSelect(item, "right")}
          onReorder={handleReorderRight}
        />
      </main>
    </div>
  );
}

