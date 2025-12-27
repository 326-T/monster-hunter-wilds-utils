import { useCallback, useEffect, useState } from "react";
import {
	allTables,
	ATTRIBUTES,
	createId,
	CURSOR_KEY,
	STORAGE_KEY,
	UNKNOWN_SKILL_LABEL,
} from "../lib/skills";
import type { CursorState, TableEntry, TableState } from "../lib/skills";

type StoredTableEntry = Omit<TableEntry, "cursorId"> & { cursorId?: number };

type StoredTableState = Record<string, StoredTableEntry[]>;

const loadFromStorage = <T>(key: string, fallback: T): T => {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
};

const saveToStorage = <T>(key: string, value: T) => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(key, JSON.stringify(value));
};

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

export function useTableState() {
	const [tables, setTables] = useState<TableState>(() =>
		normalizeTableState(loadFromStorage<StoredTableState>(STORAGE_KEY, {})),
	);
	const [cursor, setCursor] = useState<CursorState>(() =>
		normalizeCursorState(loadFromStorage<unknown>(CURSOR_KEY, 0)),
	);

	useEffect(() => {
		saveToStorage(STORAGE_KEY, tables);
	}, [tables]);

	useEffect(() => {
		saveToStorage(CURSOR_KEY, cursor);
	}, [cursor]);

	const addEntry = useCallback(
		(tableKey: string, groupSkill: string, seriesSkill: string) => {
			const entryId = createId();
			setTables((prev) => {
				const existing = prev[tableKey] ?? [];
				const nextCursorId =
					existing.reduce((max, entry) => Math.max(max, entry.cursorId), -1) +
					1;
				const newEntry: TableEntry = {
					id: entryId,
					groupSkill,
					seriesSkill,
					favorite: false,
					createdAt: new Date().toISOString(),
					cursorId: nextCursorId,
				};
				return {
					...prev,
					[tableKey]: [...existing, newEntry],
				};
			});
			return entryId;
		},
		[],
	);

	const toggleFavorite = useCallback(
		(tableKey: string, entryId: string, favorite: boolean) => {
			setTables((prev) => {
				const target = prev[tableKey] ?? [];
				const nextEntries = target.map((entry) =>
					entry.id === entryId ? { ...entry, favorite } : entry,
				);
				return {
					...prev,
					[tableKey]: nextEntries,
				};
			});
		},
		[],
	);

	const updateEntry = useCallback(
		(
			tableKey: string,
			entryId: string,
			updates: Partial<Pick<TableEntry, "groupSkill" | "seriesSkill">>,
		) => {
			setTables((prev) => {
				const target = prev[tableKey] ?? [];
				const nextEntries = target.map((entry) =>
					entry.id === entryId ? { ...entry, ...updates } : entry,
				);
				return {
					...prev,
					[tableKey]: nextEntries,
				};
			});
		},
		[],
	);

	const advanceCursor = useCallback(() => {
		const cursorId = cursor;
		const now = new Date().toISOString();
		setTables((prev) => {
			const next: TableState = { ...prev };
			for (const table of allTables) {
				const tableEntries = [...(next[table.key] ?? [])];
				const hasCursorEntry = tableEntries.some(
					(entry) => entry.cursorId === cursorId,
				);
				if (!hasCursorEntry) {
					tableEntries.push({
						id: createId(),
						groupSkill: UNKNOWN_SKILL_LABEL,
						seriesSkill: UNKNOWN_SKILL_LABEL,
						favorite: false,
						createdAt: now,
						cursorId,
					});
				}
				next[table.key] = tableEntries;
			}
			return next;
		});
		setCursor(cursorId + 1);
	}, [cursor]);

	const exportData = useCallback(() => {
		const cursorByAttribute = Object.fromEntries(
			ATTRIBUTES.map((attribute) => [attribute, cursor]),
		);
		return {
			version: 1,
			tables,
			cursor,
			cursorByAttribute,
		};
	}, [tables, cursor]);

	const importData = useCallback((payload: unknown) => {
		if (!payload || typeof payload !== "object") {
			return { ok: false, messageKey: "verify.invalidFile" };
		}
		const record = payload as Record<string, unknown>;
		const nextTables = normalizeTableState(
			(record.tables ?? record.data ?? {}) as StoredTableState,
		);
		const cursorSource =
			record.cursor ?? record.cursorState ?? record.cursorByAttribute ?? 0;
		const nextCursor = normalizeCursorState(cursorSource);
		setTables(nextTables);
		setCursor(nextCursor);
		return { ok: true };
	}, []);

	return {
		tables,
		cursor,
		addEntry,
		toggleFavorite,
		updateEntry,
		advanceCursor,
		exportData,
		importData,
	};
}
