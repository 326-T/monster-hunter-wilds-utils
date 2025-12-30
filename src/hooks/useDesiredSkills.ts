import { useCallback, useEffect, useMemo, useState } from "react";
import {
	createDesiredSkill,
	loadDesiredSkills,
	loadDesiredSkillsAsync,
	normalizeDesiredSkill,
	reloadDesiredSkillsAsync,
	saveDesiredSkills,
	type DesiredSkill,
} from "../lib/desiredSkillDb";

type DesiredSkillInput = {
	tableKey: string;
	seriesSkill?: string;
	groupSkill?: string;
};

const normalizeSkillValue = (value?: string) =>
	value?.trim() ? value : undefined;

const matchesDesiredSkill = (item: DesiredSkill, input: DesiredSkillInput) => {
	if (item.tableKey !== input.tableKey) return false;
	const seriesValue = normalizeSkillValue(item.seriesSkill);
	const groupValue = normalizeSkillValue(item.groupSkill);
	if (seriesValue && seriesValue !== input.seriesSkill) return false;
	if (groupValue && groupValue !== input.groupSkill) return false;
	return Boolean(seriesValue || groupValue);
};

export const useDesiredSkills = () => {
	const [items, setItems] = useState<DesiredSkill[]>(() => loadDesiredSkills());
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let active = true;
		void loadDesiredSkillsAsync().then((data) => {
			if (!active) return;
			setItems(data);
			setReady(true);
		});
		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		if (!ready) return;
		saveDesiredSkills(items);
	}, [items, ready]);

	const reload = useCallback(async () => {
		const data = await reloadDesiredSkillsAsync();
		setItems(data);
		setReady(true);
	}, []);

	const addDesiredSkill = useCallback((input: DesiredSkillInput) => {
		const seriesSkill = normalizeSkillValue(input.seriesSkill);
		const groupSkill = normalizeSkillValue(input.groupSkill);
		if (!seriesSkill && !groupSkill) return;
		const next = createDesiredSkill({
			tableKey: input.tableKey,
			seriesSkill,
			groupSkill,
		});
		setItems((prev) => [next, ...prev]);
	}, []);

	const updateDesiredSkill = useCallback(
		(id: string, updates: Partial<DesiredSkill>) => {
			setItems((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const removeDesiredSkill = useCallback((id: string) => {
		setItems((prev) => prev.filter((item) => item.id !== id));
	}, []);

	const toggleAcquired = useCallback((id: string, acquired: boolean) => {
		const now = acquired ? new Date().toISOString() : undefined;
		setItems((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, acquired, acquiredAt: now } : item,
			),
		);
	}, []);

	const markAcquiredFromSelection = useCallback(
		(input: DesiredSkillInput) => {
			const matches = items.filter((item) => matchesDesiredSkill(item, input));
			if (matches.length === 0) return;
			const now = new Date().toISOString();
			setItems((prev) =>
				prev.map((item) =>
					matchesDesiredSkill(item, input)
						? { ...item, acquired: true, acquiredAt: now }
						: item,
				),
			);
		},
		[items],
	);

	const sortedItems = useMemo(
		() =>
			[...items].sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			),
		[items],
	);

	const replaceDesiredSkills = useCallback((next: DesiredSkill[]) => {
		const normalized = next
			.map((item) => normalizeDesiredSkill(item))
			.filter((item): item is DesiredSkill => Boolean(item));
		setItems(normalized);
		setReady(true);
	}, []);

	return {
		items: sortedItems,
		ready,
		reload,
		addDesiredSkill,
		updateDesiredSkill,
		removeDesiredSkill,
		toggleAcquired,
		markAcquiredFromSelection,
		replaceDesiredSkills,
	};
};
