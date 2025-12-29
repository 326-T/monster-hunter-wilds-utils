export type OcrDatasetSample = {
	entryId: string;
	createdAt: string;
	language: "ja" | "en";
	tableKey: string;
	cursorId: number;
	seriesSkill: string;
	groupSkill: string;
	labelSeries?: string;
	labelGroup?: string;
	rawText: string;
	imageDataUrl: string;
	source: "manual" | "auto";
};

const DB_NAME = "mhwu-ocr";
const DB_VERSION = 2;
const DATASET_STORE = "ocrDataset";
const REVIEWED_STORE = "ocrReviewed";

let datasetCache: OcrDatasetSample[] = [];
let datasetDbChecked = false;
let datasetLoadPromise: Promise<OcrDatasetSample[]> | null = null;

let reviewedCache: string[] = [];
let reviewedDbChecked = false;
let reviewedLoadPromise: Promise<string[]> | null = null;

const canUseIndexedDb = () => typeof indexedDB !== "undefined";
const requestToPromise = <T>(request: IDBRequest<T>) =>
	new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const waitForTransaction = (transaction: IDBTransaction) =>
	new Promise<void>((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});

const isDatasetSample = (value: unknown): value is OcrDatasetSample => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<OcrDatasetSample>;
	return (
		typeof candidate.entryId === "string" &&
		typeof candidate.createdAt === "string"
	);
};

const openDatasetDb = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		if (!canUseIndexedDb()) {
			reject(new Error("IndexedDB is not available"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(DATASET_STORE)) {
				db.createObjectStore(DATASET_STORE);
			}
			if (!db.objectStoreNames.contains(REVIEWED_STORE)) {
				db.createObjectStore(REVIEWED_STORE);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const readStoreValues = async <T>(
	db: IDBDatabase,
	storeName: string,
): Promise<T[]> => {
	const transaction = db.transaction(storeName, "readonly");
	const done = waitForTransaction(transaction);
	const store = transaction.objectStore(storeName);
	const values = await requestToPromise(store.getAll());
	await done;
	return values as T[];
};

const readStoreKeys = async (
	db: IDBDatabase,
	storeName: string,
): Promise<IDBValidKey[]> => {
	const transaction = db.transaction(storeName, "readonly");
	const done = waitForTransaction(transaction);
	const store = transaction.objectStore(storeName);
	const keys = await requestToPromise(store.getAllKeys());
	await done;
	return keys;
};

const readDatasetFromDb = async (): Promise<{
	samples: OcrDatasetSample[];
}> => {
	if (!canUseIndexedDb()) {
		return { samples: [] };
	}
	const db = await openDatasetDb();
	try {
		const values = await readStoreValues<unknown>(db, DATASET_STORE);
		const samples: OcrDatasetSample[] = [];
		for (const value of values) {
			if (isDatasetSample(value)) {
				samples.push(value);
			}
		}
		return { samples };
	} finally {
		db.close();
	}
};

const readReviewedFromDb = async (): Promise<{
	ids: string[];
}> => {
	if (!canUseIndexedDb()) {
		return { ids: [] };
	}
	const db = await openDatasetDb();
	try {
		const keys = await readStoreKeys(db, REVIEWED_STORE);
		const ids = keys.filter((key): key is string => typeof key === "string");
		return { ids };
	} finally {
		db.close();
	}
};

const writeDatasetToDb = async (
	samples: OcrDatasetSample[],
	previousIds?: Set<string>,
) => {
	if (!canUseIndexedDb()) return;
	const db = await openDatasetDb();
	try {
		const transaction = db.transaction(DATASET_STORE, "readwrite");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(DATASET_STORE);
		if (!previousIds) {
			store.clear();
		}
		for (const sample of samples) {
			store.put(sample, sample.entryId);
		}
		if (previousIds) {
			const nextIds = new Set(samples.map((sample) => sample.entryId));
			for (const id of previousIds) {
				if (!nextIds.has(id)) {
					store.delete(id);
				}
			}
		}
		await done;
	} finally {
		db.close();
	}
};

const writeReviewedToDb = async (ids: string[], previousIds?: Set<string>) => {
	if (!canUseIndexedDb()) return;
	const db = await openDatasetDb();
	try {
		const transaction = db.transaction(REVIEWED_STORE, "readwrite");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(REVIEWED_STORE);
		if (!previousIds) {
			store.clear();
		}
		for (const id of ids) {
			store.put(true, id);
		}
		if (previousIds) {
			const nextIds = new Set(ids);
			for (const id of previousIds) {
				if (!nextIds.has(id)) {
					store.delete(id);
				}
			}
		}
		await done;
	} finally {
		db.close();
	}
};

export const loadDataset = () => datasetCache;

export const loadDatasetAsync = async (): Promise<OcrDatasetSample[]> => {
	if (datasetDbChecked) return datasetCache;
	if (datasetLoadPromise) return datasetLoadPromise;
	datasetLoadPromise = (async () => {
		try {
			const { samples } = await readDatasetFromDb();
			datasetCache = samples;
			datasetDbChecked = true;
			return samples;
		} finally {
			datasetLoadPromise = null;
		}
	})();
	return datasetLoadPromise;
};

export const reloadDatasetAsync = async (): Promise<OcrDatasetSample[]> => {
	const { samples } = await readDatasetFromDb();
	datasetCache = samples;
	datasetDbChecked = true;
	return samples;
};

export const reloadDatasetFromDbOnly = async (): Promise<
	OcrDatasetSample[]
> => {
	const { samples } = await readDatasetFromDb();
	datasetCache = samples;
	datasetDbChecked = true;
	return samples;
};

export const saveDataset = (samples: OcrDatasetSample[]) => {
	const previousIds = new Set(datasetCache.map((sample) => sample.entryId));
	datasetCache = samples;
	datasetDbChecked = true;
	if (!canUseIndexedDb()) return;
	void writeDatasetToDb(samples, previousIds).then(() => {
		if (typeof window === "undefined") return;
		window.dispatchEvent(
			new CustomEvent("mhwu-ocr-dataset-updated", {
				detail: samples.length,
			}),
		);
	});
};

export const clearDataset = () => {
	datasetCache = [];
	datasetDbChecked = true;
	if (canUseIndexedDb()) {
		void (async () => {
			const db = await openDatasetDb();
			try {
				const transaction = db.transaction(DATASET_STORE, "readwrite");
				const done = waitForTransaction(transaction);
				transaction.objectStore(DATASET_STORE).clear();
				await done;
			} finally {
				db.close();
			}
		})();
	}
};

export const getDatasetAsync = async () => loadDatasetAsync();

export const exportDataset = async () => {
	const samples = await loadDatasetAsync();
	const payload = {
		version: 1,
		createdAt: new Date().toISOString(),
		samples,
	};
	const blob = new Blob([JSON.stringify(payload, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	link.download = `mhwu-ocr-dataset-${timestamp}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};

export const loadReviewedIds = () => reviewedCache;

export const loadReviewedIdsAsync = async (): Promise<string[]> => {
	if (reviewedDbChecked) return reviewedCache;
	if (reviewedLoadPromise) return reviewedLoadPromise;
	reviewedLoadPromise = (async () => {
		try {
			const { ids } = await readReviewedFromDb();
			reviewedCache = ids;
			reviewedDbChecked = true;
			return ids;
		} finally {
			reviewedLoadPromise = null;
		}
	})();
	return reviewedLoadPromise;
};

export const reloadReviewedIdsAsync = async (): Promise<string[]> => {
	const { ids } = await readReviewedFromDb();
	reviewedCache = ids;
	reviewedDbChecked = true;
	return ids;
};

export const saveReviewedIds = (ids: string[]) => {
	const previousIds = new Set(reviewedCache);
	reviewedCache = ids;
	reviewedDbChecked = true;
	if (!canUseIndexedDb()) return;
	void writeReviewedToDb(ids, previousIds);
};

export const clearReviewedIds = () => {
	reviewedCache = [];
	reviewedDbChecked = true;
	if (canUseIndexedDb()) {
		void (async () => {
			const db = await openDatasetDb();
			try {
				const transaction = db.transaction(REVIEWED_STORE, "readwrite");
				const done = waitForTransaction(transaction);
				transaction.objectStore(REVIEWED_STORE).clear();
				await done;
			} finally {
				db.close();
			}
		})();
	}
};
