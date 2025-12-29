import type { CursorState, TableEntry, TableState } from "./skills";
import { CURSOR_KEY, STORAGE_KEY } from "./skills";

type StoredTableEntry = Omit<TableEntry, "cursorId"> & { cursorId?: number };
type StoredTableState = Record<string, StoredTableEntry[]>;
type TableEntryRecord = TableEntry & { tableKey: string };

type TableStateSnapshot = {
	tables: TableState;
	cursor: CursorState;
};

const DB_NAME = "mhwu-app";
const DB_VERSION = 1;
const TABLE_STORE = "tableEntries";
const CURSOR_STORE = "cursorState";
const CURSOR_KEY_ID = "cursor";
const MIGRATED_TABLES_KEY = `${STORAGE_KEY}.migrated`;
const MIGRATED_CURSOR_KEY = `${CURSOR_KEY}.migrated`;

let cacheTables: TableState = {};
let cacheCursor: CursorState = 0;
let dbChecked = false;
let loadPromise: Promise<TableStateSnapshot> | null = null;
let tableWriteChain = Promise.resolve();
let cursorWriteChain = Promise.resolve();

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

const openAppDb = () =>
	new Promise<IDBDatabase>((resolve, reject) => {
		if (!canUseIndexedDb()) {
			reject(new Error("IndexedDB is not available"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(TABLE_STORE)) {
				db.createObjectStore(TABLE_STORE, { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(CURSOR_STORE)) {
				db.createObjectStore(CURSOR_STORE);
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

const normalizeTableState = (state: StoredTableState): TableState => {
	const normalized: TableState = {};
	for (const [key, entries] of Object.entries(state)) {
		const hasAllCursorIds = entries.every(
			(entry) => typeof entry.cursorId === "number",
		);
		if (hasAllCursorIds) {
			normalized[key] = entries as TableEntry[];
			continue;
		}
		const sorted = [...entries].sort((a, b) =>
			a.createdAt.localeCompare(b.createdAt),
		);
		normalized[key] = sorted.map((entry, index) => ({
			...entry,
			cursorId: entry.cursorId ?? index,
		}));
	}
	return normalized;
};

const normalizeCursorState = (value: unknown): CursorState => {
	if (typeof value === "number") return value;
	if (value && typeof value === "object") {
		const numbers = Object.values(value as Record<string, unknown>).filter(
			(entry): entry is number => typeof entry === "number",
		);
		if (numbers.length > 0) return Math.max(...numbers);
	}
	return 0;
};

const readLegacyStorage = (): {
	tablesRaw: string | null;
	cursorRaw: string | null;
	tables: StoredTableState;
	cursor: unknown;
} => {
	if (!canUseLocalStorage()) {
		return { tablesRaw: null, cursorRaw: null, tables: {}, cursor: null };
	}
	const tablesRaw = window.localStorage.getItem(STORAGE_KEY);
	const cursorRaw = window.localStorage.getItem(CURSOR_KEY);
	let tables: StoredTableState = {};
	let cursor: unknown = null;
	try {
		if (tablesRaw) {
			const parsed = JSON.parse(tablesRaw);
			if (parsed && typeof parsed === "object") {
				tables = parsed as StoredTableState;
			}
		}
	} catch {
		tables = {};
	}
	try {
		if (cursorRaw) {
			cursor = JSON.parse(cursorRaw) as unknown;
		}
	} catch {
		cursor = null;
	}
	return { tablesRaw, cursorRaw, tables, cursor };
};

const renameLegacyKeys = (
	tablesRaw: string | null,
	cursorRaw: string | null,
) => {
	if (!canUseLocalStorage()) return;
	if (tablesRaw !== null) {
		window.localStorage.setItem(MIGRATED_TABLES_KEY, tablesRaw);
		window.localStorage.removeItem(STORAGE_KEY);
	}
	if (cursorRaw !== null) {
		window.localStorage.setItem(MIGRATED_CURSOR_KEY, cursorRaw);
		window.localStorage.removeItem(CURSOR_KEY);
	}
};

const readTablesFromDb = async (): Promise<TableState> => {
	if (!canUseIndexedDb()) return {};
	const db = await openAppDb();
	try {
		const transaction = db.transaction(TABLE_STORE, "readonly");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(TABLE_STORE);
		const records = (await requestToPromise(
			store.getAll(),
		)) as TableEntryRecord[];
		await done;
		const tables: TableState = {};
		for (const record of records) {
			const { tableKey, ...entry } = record;
			if (!tableKey) continue;
			if (!tables[tableKey]) tables[tableKey] = [];
			tables[tableKey].push(entry);
		}
		return tables;
	} finally {
		db.close();
	}
};

const readCursorFromDb = async (): Promise<CursorState | null> => {
	if (!canUseIndexedDb()) return null;
	const db = await openAppDb();
	try {
		const transaction = db.transaction(CURSOR_STORE, "readonly");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(CURSOR_STORE);
		const value = await requestToPromise(store.get(CURSOR_KEY_ID));
		await done;
		return typeof value === "number" ? value : null;
	} finally {
		db.close();
	}
};

const writeTablesToDb = async (tables: TableState) => {
	if (!canUseIndexedDb()) return;
	const db = await openAppDb();
	try {
		const transaction = db.transaction(TABLE_STORE, "readwrite");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(TABLE_STORE);
		store.clear();
		for (const [tableKey, entries] of Object.entries(tables)) {
			for (const entry of entries) {
				const record: TableEntryRecord = { ...entry, tableKey };
				store.put(record);
			}
		}
		await done;
	} finally {
		db.close();
	}
};

const writeCursorToDb = async (cursor: CursorState) => {
	if (!canUseIndexedDb()) return;
	const db = await openAppDb();
	try {
		const transaction = db.transaction(CURSOR_STORE, "readwrite");
		const done = waitForTransaction(transaction);
		const store = transaction.objectStore(CURSOR_STORE);
		store.put(cursor, CURSOR_KEY_ID);
		await done;
	} finally {
		db.close();
	}
};

const mergeTableStates = (
	base: TableState,
	incoming: TableState,
): TableState => {
	const next: TableState = { ...base };
	for (const [tableKey, entries] of Object.entries(incoming)) {
		const existing = next[tableKey] ?? [];
		const map = new Map(existing.map((entry) => [entry.id, entry]));
		for (const entry of entries) {
			if (!map.has(entry.id)) {
				map.set(entry.id, entry);
			}
		}
		next[tableKey] = Array.from(map.values());
	}
	return next;
};

export const loadTableStateSnapshot = (): TableStateSnapshot => {
	if (dbChecked) {
		return { tables: cacheTables, cursor: cacheCursor };
	}
	const legacy = readLegacyStorage();
	const legacyTables = normalizeTableState(legacy.tables);
	const legacyCursor = normalizeCursorState(legacy.cursor);
	return { tables: legacyTables, cursor: legacyCursor };
};

export const loadTableStateAsync = async (): Promise<TableStateSnapshot> => {
	if (dbChecked) return { tables: cacheTables, cursor: cacheCursor };
	if (loadPromise) return loadPromise;
	loadPromise = (async () => {
		try {
			const [dbTables, dbCursor] = await Promise.all([
				readTablesFromDb(),
				readCursorFromDb(),
			]);
			const legacy = readLegacyStorage();
			const hasLegacyTables = Object.keys(legacy.tables).length > 0;
			const hasLegacyCursor = legacy.cursor !== null;
			let tables = dbTables;
			let cursor = normalizeCursorState(dbCursor);

			if (hasLegacyTables) {
				const legacyTables = normalizeTableState(legacy.tables);
				tables = mergeTableStates(dbTables, legacyTables);
			}
			if (hasLegacyCursor) {
				const legacyCursor = normalizeCursorState(legacy.cursor);
				cursor = Math.max(cursor, legacyCursor);
			}
			tables = normalizeTableState(tables as StoredTableState);

			if (hasLegacyTables || hasLegacyCursor) {
				await writeTablesToDb(tables);
				await writeCursorToDb(cursor);
				renameLegacyKeys(legacy.tablesRaw, legacy.cursorRaw);
			}

			cacheTables = tables;
			cacheCursor = cursor;
			dbChecked = true;
			return { tables, cursor };
		} finally {
			loadPromise = null;
		}
	})();
	return loadPromise;
};

export const saveTableState = (tables: TableState) => {
	cacheTables = tables;
	dbChecked = true;
	if (!canUseIndexedDb()) return;
	const snapshot = { ...tables };
	tableWriteChain = tableWriteChain
		.then(() => writeTablesToDb(snapshot))
		.catch(() => undefined);
};

export const saveCursorState = (cursor: CursorState) => {
	cacheCursor = cursor;
	dbChecked = true;
	if (!canUseIndexedDb()) return;
	cursorWriteChain = cursorWriteChain
		.then(() => writeCursorToDb(cursor))
		.catch(() => undefined);
};
