import axios, { AxiosRequestConfig } from "axios";

type RequestKey = string;

type QueuedRequest = {
  key: RequestKey;
  config: AxiosRequestConfig;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type QueueBuckets = {
  addItems: QueuedRequest[];
  mutateSelection: QueuedRequest[];
  getData: QueuedRequest[];
};

const queue: QueueBuckets = {
  addItems: [],
  mutateSelection: [],
  getData: [],
};

const pendingKeys = new Set<RequestKey>();

function makeKey(config: AxiosRequestConfig): RequestKey {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";
  const body = config.data ? JSON.stringify(config.data) : "";
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${method}::${url}::${body}::${params}`;
}

function enqueue(bucket: keyof QueueBuckets, config: AxiosRequestConfig): Promise<unknown> {
  const key = makeKey(config);

  if (pendingKeys.has(key)) {
    // дедупликация: не добавляем такой же запрос повторно
    return Promise.resolve(null);
  }

  pendingKeys.add(key);

  return new Promise((resolve, reject) => {
    queue[bucket].push({ key, config, resolve, reject });
  });
}

async function flushBucket(bucket: keyof QueueBuckets) {
  const items = queue[bucket];
  if (items.length === 0) return;

  queue[bucket] = [];

  // Для простоты отправляем каждый запрос отдельно,
  // но именно момент отправки контролируем батчером.
  await Promise.all(
    items.map(async (item) => {
      try {
        const response = await axios(item.config);
        item.resolve(response.data);
      } catch (err) {
        item.reject(err);
      } finally {
        pendingKeys.delete(item.key);
      }
    }),
  );
}

// Батчинг: добавление элементов раз в 10 секунд
setInterval(() => {
  void flushBucket("addItems");
}, 10_000);

// Батчинг: получение и изменение данных раз в секунду
setInterval(() => {
  void Promise.all([flushBucket("mutateSelection"), flushBucket("getData")]);
}, 1_000);

export const requestQueue = {
  addItems(config: AxiosRequestConfig) {
    return enqueue("addItems", config);
  },
  mutateSelection(config: AxiosRequestConfig) {
    return enqueue("mutateSelection", config);
  },
  getData(config: AxiosRequestConfig) {
    return enqueue("getData", config);
  },
};

