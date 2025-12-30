import { useCallback, useEffect, useRef, useState } from "react";
import { allTables, ATTRIBUTES, createId } from "../lib/skills";
import type { CursorState, TableEntry, TableState } from "../lib/skills";
import {
	loadTableStateAsync,
	loadTableStateSnapshot,
	saveCursorState,
	saveTableState,
} from "../lib/tableStateDb";

type StoredTableEntry = Omit<TableEntry, "cursorId"> & { cursorId?: number };
type StoredTableState = Record<string, StoredTableEntry[]>;

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
	const initialSnapshot = loadTableStateSnapshot();
	const [tables, setTables] = useState<TableState>(initialSnapshot.tables);
	const [cursor, setCursor] = useState<CursorState>(initialSnapshot.cursor);
	const [ready, setReady] = useState(false);
	const manualOverrideRef = useRef(false);

	useEffect(() => {
		let active = true;
		void loadTableStateAsync().then((snapshot) => {
			if (!active) return;
			if (manualOverrideRef.current) {
				setReady(true);
				return;
			}
			setTables(snapshot.tables);
			setCursor(snapshot.cursor);
			setReady(true);
		});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!ready) return;
		saveTableState(tables);
	}, [tables, ready]);

	useEffect(() => {
		if (!ready) return;
		saveCursorState(cursor);
	}, [cursor, ready]);

	const addEntry = useCallback(
		(tableKey: string, groupSkill: string, seriesSkill: string) => {
			const entryId = createId();
			let nextCursorId = 0;
			setTables((prev) => {
				const existing = prev[tableKey] ?? [];
				nextCursorId =
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
			return { id: entryId, cursorId: nextCursorId };
		},
		[],
	);

	const deleteEntry = useCallback((tableKey: string, entryId: string) => {
		setTables((prev) => {
			const existing = prev[tableKey] ?? [];
			const remaining = existing.filter((entry) => entry.id !== entryId);
			const sorted = [...remaining].sort((a, b) => {
				if (a.cursorId !== b.cursorId) return a.cursorId - b.cursorId;
				return a.createdAt.localeCompare(b.createdAt);
			});
			const reindexed = sorted.map((entry, index) => ({
				...entry,
				cursorId: index,
			}));
			return {
				...prev,
				[tableKey]: reindexed,
			};
		});
	}, []);

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

	const advanceCursor = useCallback(
		(selected?: { tableKey: string; entryId: string }) => {
			const cursorId = cursor;
			const now = new Date().toISOString();
			setTables((prev) => {
				const next: TableState = { ...prev };
				for (const table of allTables) {
					const tableEntries = [...(next[table.key] ?? [])];
					const updatedEntries = tableEntries.map((entry) =>
						entry.cursorId === cursorId && entry.advancedAt
							? { ...entry, advancedAt: undefined }
							: entry,
					);
					next[table.key] = updatedEntries;
				}
				if (selected) {
					const targetEntries = next[selected.tableKey] ?? [];
					next[selected.tableKey] = targetEntries.map((entry) =>
						entry.id === selected.entryId
							? { ...entry, advancedAt: now }
							: entry,
					);
				}
				return next;
			});
			setCursor(cursorId + 1);
		},
		[cursor],
	);

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
		manualOverrideRef.current = true;
		setTables(nextTables);
		setCursor(nextCursor);
		saveTableState(nextTables);
		saveCursorState(nextCursor);
		setReady(true);
		return { ok: true };
	}, []);

	return {
		tables,
		cursor,
		addEntry,
		deleteEntry,
		toggleFavorite,
		updateEntry,
		advanceCursor,
		exportData,
		importData,
	};
}
