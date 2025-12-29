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

const OCR_DATASET_KEY = "mhwu.ocr.dataset";
const OCR_DATASET_LEGACY_KEYS = ["mhwu.ocr.dataset.v1"] as const;
const OCR_REVIEWED_KEY = "mhwu.ocr.dataset.reviewed.v1";
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
const canUseLocalStorage = () =>
	typeof window !== "undefined" && typeof window.localStorage !== "undefined";

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

const parseDatasetPayload = (value: unknown): OcrDatasetSample[] => {
	if (Array.isArray(value)) {
		return value.filter(isDatasetSample);
	}
	if (value && typeof value === "object") {
		const samples = (value as { samples?: unknown }).samples;
		if (Array.isArray(samples)) {
			return samples.filter(isDatasetSample);
		}
	}
	return [];
};

const parseReviewedPayload = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.filter((entry): entry is string => typeof entry === "string");
	}
	if (value && typeof value === "object") {
		const reviewedIds = (value as { reviewedIds?: unknown }).reviewedIds;
		if (Array.isArray(reviewedIds)) {
			return reviewedIds.filter(
				(entry): entry is string => typeof entry === "string",
			);
		}
	}
	return [];
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

const readReviewedLegacyFromDatasetStore = async (
	db: IDBDatabase,
): Promise<string[]> => {
	const transaction = db.transaction(DATASET_STORE, "readonly");
	const done = waitForTransaction(transaction);
	const store = transaction.objectStore(DATASET_STORE);
	const legacy = await requestToPromise(store.get(OCR_REVIEWED_KEY));
	await done;
	return parseReviewedPayload(legacy);
};

const readDatasetFromDb = async (): Promise<{
	samples: OcrDatasetSample[];
	legacyDetected: boolean;
}> => {
	if (!canUseIndexedDb()) {
		return { samples: [], legacyDetected: false };
	}
	const db = await openDatasetDb();
	try {
		const values = await readStoreValues<unknown>(db, DATASET_STORE);
		const samples: OcrDatasetSample[] = [];
		let legacySamples: OcrDatasetSample[] | null = null;
		for (const value of values) {
			if (isDatasetSample(value)) {
				samples.push(value);
				continue;
			}
			const parsed = parseDatasetPayload(value);
			if (parsed.length > 0) {
				if (!legacySamples || parsed.length > legacySamples.length) {
					legacySamples = parsed;
				}
			}
		}
		const legacyDetected = Boolean(legacySamples);
		if (samples.length > 0) {
			return { samples, legacyDetected };
		}
		if (legacySamples) {
			return { samples: legacySamples, legacyDetected: true };
		}
		return { samples: [], legacyDetected: false };
	} finally {
		db.close();
	}
};

const readReviewedFromDb = async (): Promise<{
	ids: string[];
	legacyDetected: boolean;
}> => {
	if (!canUseIndexedDb()) {
		return { ids: [], legacyDetected: false };
	}
	const db = await openDatasetDb();
	try {
		const keys = await readStoreKeys(db, REVIEWED_STORE);
		const ids = keys.filter((key): key is string => typeof key === "string");
		if (ids.length > 0) {
			return { ids, legacyDetected: false };
		}
		const legacy = await readReviewedLegacyFromDatasetStore(db);
		if (legacy.length > 0) {
			return { ids: legacy, legacyDetected: true };
		}
		return { ids: [], legacyDetected: false };
	} finally {
		db.close();
	}
};

const readDatasetFromLocalStorage = (): OcrDatasetSample[] => {
	if (!canUseLocalStorage()) return [];
	const keys = [OCR_DATASET_KEY, ...OCR_DATASET_LEGACY_KEYS];
	for (const key of keys) {
		const raw = window.localStorage.getItem(key);
		if (!raw) continue;
		try {
			const parsed = JSON.parse(raw);
			const samples = parseDatasetPayload(parsed);
			if (samples.length > 0) return samples;
		} catch {
			continue;
		}
	}
	return [];
};

const readReviewedFromLocalStorage = (): string[] => {
	if (!canUseLocalStorage()) return [];
	const raw = window.localStorage.getItem(OCR_REVIEWED_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return parseReviewedPayload(parsed);
	} catch {
		return [];
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
		samples.forEach((sample) => {
			store.put(sample, sample.entryId);
		});
		store.delete(OCR_DATASET_KEY);
		OCR_DATASET_LEGACY_KEYS.forEach((key) => store.delete(key));
		store.delete(OCR_REVIEWED_KEY);
		if (previousIds) {
			const nextIds = new Set(samples.map((sample) => sample.entryId));
			previousIds.forEach((id) => {
				if (!nextIds.has(id)) {
					store.delete(id);
				}
			});
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
		ids.forEach((id) => {
			store.put(true, id);
		});
		if (previousIds) {
			const nextIds = new Set(ids);
			previousIds.forEach((id) => {
				if (!nextIds.has(id)) {
					store.delete(id);
				}
			});
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
			let { samples, legacyDetected } = await readDatasetFromDb();
			if (legacyDetected && samples.length > 0) {
				await writeDatasetToDb(samples);
			}
			if (samples.length === 0) {
				const localSamples = readDatasetFromLocalStorage();
				if (localSamples.length > 0) {
					await writeDatasetToDb(localSamples);
					samples = localSamples;
				}
			}
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
	const { samples, legacyDetected } = await readDatasetFromDb();
	let finalSamples = samples;
	if (legacyDetected && samples.length > 0) {
		await writeDatasetToDb(samples);
	}
	if (finalSamples.length === 0) {
		const localSamples = readDatasetFromLocalStorage();
		if (localSamples.length > 0) {
			await writeDatasetToDb(localSamples);
			finalSamples = localSamples;
		}
	}
	datasetCache = finalSamples;
	datasetDbChecked = true;
	return finalSamples;
};

export const reloadDatasetFromDbOnly = async (): Promise<OcrDatasetSample[]> => {
	const { samples, legacyDetected } = await readDatasetFromDb();
	if (legacyDetected && samples.length > 0) {
		await writeDatasetToDb(samples);
	}
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
	if (canUseLocalStorage()) {
		window.localStorage.removeItem(OCR_DATASET_KEY);
		OCR_DATASET_LEGACY_KEYS.forEach((key) =>
			window.localStorage.removeItem(key),
		);
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
			let { ids, legacyDetected } = await readReviewedFromDb();
			if (legacyDetected && ids.length > 0) {
				await writeReviewedToDb(ids);
			}
			if (ids.length === 0) {
				const localIds = readReviewedFromLocalStorage();
				if (localIds.length > 0) {
					await writeReviewedToDb(localIds);
					ids = localIds;
				}
			}
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
	const { ids, legacyDetected } = await readReviewedFromDb();
	let finalIds = ids;
	if (legacyDetected && ids.length > 0) {
		await writeReviewedToDb(ids);
	}
	if (finalIds.length === 0) {
		const localIds = readReviewedFromLocalStorage();
		if (localIds.length > 0) {
			await writeReviewedToDb(localIds);
			finalIds = localIds;
		}
	}
	reviewedCache = finalIds;
	reviewedDbChecked = true;
	return finalIds;
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
	if (canUseLocalStorage()) {
		window.localStorage.removeItem(OCR_REVIEWED_KEY);
	}
};
