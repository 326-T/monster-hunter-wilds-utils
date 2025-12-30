import { createId } from "./skills";

export type DesiredSkill = {
	id: string;
	tableKey: string;
	seriesSkill?: string;
	groupSkill?: string;
	acquired: boolean;
	createdAt: string;
	acquiredAt?: string;
};

const DB_NAME = "mhwu-app";
const DB_VERSION = 3;
const STORE_NAME = "desiredSkills";

let cache: DesiredSkill[] = [];
let dbChecked = false;
let loadPromise: Promise<DesiredSkill[]> | null = null;
let writeChain = Promise.resolve();

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

const isDesiredSkill = (value: unknown): value is DesiredSkill => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<DesiredSkill>;
	return (
		typeof candidate.id === "string" && typeof candidate.tableKey === "string"
	);
};

const openAppDb = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		if (!canUseIndexedDb()) {
			reject(new Error("IndexedDB is not available"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const readFromDb = async (): Promise<DesiredSkill[]> => {
	if (!canUseIndexedDb()) return [];
	const db = await openAppDb();
	try {
		const transaction = db.transaction(STORE_NAME, "readonly");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(STORE_NAME);
		const records = (await requestToPromise(store.getAll())) as DesiredSkill[];
		await done;
		return records.filter(isDesiredSkill);
	} finally {
		db.close();
	}
};

const writeToDb = async (items: DesiredSkill[], previousIds?: Set<string>) => {
	if (!canUseIndexedDb()) return;
	const db = await openAppDb();
	try {
		const transaction = db.transaction(STORE_NAME, "readwrite");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(STORE_NAME);
		if (!previousIds) {
			store.clear();
		}
		for (const item of items) {
			store.put(item);
		}
		if (previousIds) {
			const nextIds = new Set(items.map((item) => item.id));
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

export const loadDesiredSkills = () => cache;

export const loadDesiredSkillsAsync = async (): Promise<DesiredSkill[]> => {
	if (dbChecked) return cache;
	if (loadPromise) return loadPromise;
	loadPromise = (async () => {
		try {
			const items = await readFromDb();
			cache = items;
			dbChecked = true;
			return items;
		} finally {
			loadPromise = null;
		}
	})();
	return loadPromise;
};

export const reloadDesiredSkillsAsync = async (): Promise<DesiredSkill[]> => {
	const items = await readFromDb();
	cache = items;
	dbChecked = true;
	return items;
};

export const saveDesiredSkills = (items: DesiredSkill[]) => {
	const previousIds = new Set(cache.map((item) => item.id));
	cache = items;
	dbChecked = true;
	if (!canUseIndexedDb()) return;
	writeChain = writeChain
		.then(() => writeToDb(items, previousIds))
		.catch(() => undefined);
};

export const createDesiredSkill = (input: {
	tableKey: string;
	seriesSkill?: string;
	groupSkill?: string;
}) => {
	const now = new Date().toISOString();
	return {
		id: createId(),
		tableKey: input.tableKey,
		seriesSkill: input.seriesSkill,
		groupSkill: input.groupSkill,
		acquired: false,
		createdAt: now,
		acquiredAt: undefined,
	} satisfies DesiredSkill;
};

export const normalizeDesiredSkill = (value: unknown): DesiredSkill | null => {
	if (!value || typeof value !== "object") return null;
	const candidate = value as Partial<DesiredSkill>;
	if (typeof candidate.tableKey !== "string" || candidate.tableKey.length === 0)
		return null;
	const now = new Date().toISOString();
	const id = typeof candidate.id === "string" ? candidate.id : createId();
	const seriesSkill =
		typeof candidate.seriesSkill === "string"
			? candidate.seriesSkill
			: undefined;
	const groupSkill =
		typeof candidate.groupSkill === "string" ? candidate.groupSkill : undefined;
	const acquired =
		typeof candidate.acquired === "boolean" ? candidate.acquired : false;
	const createdAt =
		typeof candidate.createdAt === "string" ? candidate.createdAt : now;
	const acquiredAt =
		typeof candidate.acquiredAt === "string"
			? candidate.acquiredAt
			: acquired
				? now
				: undefined;
	return {
		id,
		tableKey: candidate.tableKey,
		seriesSkill,
		groupSkill,
		acquired,
		createdAt,
		acquiredAt,
	};
};
