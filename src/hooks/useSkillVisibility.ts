import { useCallback, useEffect, useMemo, useState } from "react";

const GROUP_VISIBILITY_KEY = "mhwu.groupSkillVisibility.v1";
const SERIES_VISIBILITY_KEY = "mhwu.seriesSkillVisibility.v1";

const loadVisibility = (key: string): string[] | null => {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			return parsed.filter((item): item is string => typeof item === "string");
		}
		return null;
	} catch {
		return null;
	}
};

const saveVisibility = (key: string, value: string[]) => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(key, JSON.stringify(value));
};

const normalizeVisibility = (current: string[] | null, options: string[]) => {
	if (options.length === 0) return current ?? [];
	if (current === null) return [...options];
	const set = new Set(current);
	return options.filter((option) => set.has(option));
};

const toggleVisibility = (
	current: string[] | null,
	options: string[],
	option: string,
) => {
	if (options.length === 0) return current ?? [];
	const set = new Set(current ?? options);
	if (set.has(option)) {
		set.delete(option);
	} else {
		set.add(option);
	}
	return options.filter((item) => set.has(item));
};

type SkillVisibilityState = {
	visibleGroupOptions: string[];
	visibleSeriesOptions: string[];
	visibleGroupSet: Set<string>;
	visibleSeriesSet: Set<string>;
	hiddenGroupCount: number;
	hiddenSeriesCount: number;
	toggleGroupVisibility: (option: string) => void;
	toggleSeriesVisibility: (option: string) => void;
	showAllGroup: () => void;
	showAllSeries: () => void;
	hideAllGroup: () => void;
	hideAllSeries: () => void;
};

export function useSkillVisibility(
	groupOptions: string[],
	seriesOptions: string[],
): SkillVisibilityState {
	const [visibleGroup, setVisibleGroup] = useState<string[] | null>(() =>
		loadVisibility(GROUP_VISIBILITY_KEY),
	);
	const [visibleSeries, setVisibleSeries] = useState<string[] | null>(() =>
		loadVisibility(SERIES_VISIBILITY_KEY),
	);

	useEffect(() => {
		if (visibleGroup === null) return;
		saveVisibility(
			GROUP_VISIBILITY_KEY,
			normalizeVisibility(visibleGroup, groupOptions),
		);
	}, [groupOptions, visibleGroup]);

	useEffect(() => {
		if (visibleSeries === null) return;
		saveVisibility(
			SERIES_VISIBILITY_KEY,
			normalizeVisibility(visibleSeries, seriesOptions),
		);
	}, [seriesOptions, visibleSeries]);

	const visibleGroupOptions = useMemo(
		() => normalizeVisibility(visibleGroup, groupOptions),
		[visibleGroup, groupOptions],
	);
	const visibleSeriesOptions = useMemo(
		() => normalizeVisibility(visibleSeries, seriesOptions),
		[visibleSeries, seriesOptions],
	);

	const visibleGroupSet = useMemo(
		() => new Set(visibleGroupOptions),
		[visibleGroupOptions],
	);
	const visibleSeriesSet = useMemo(
		() => new Set(visibleSeriesOptions),
		[visibleSeriesOptions],
	);

	const hiddenGroupCount = Math.max(
		0,
		groupOptions.length - visibleGroupOptions.length,
	);
	const hiddenSeriesCount = Math.max(
		0,
		seriesOptions.length - visibleSeriesOptions.length,
	);

	const toggleGroupVisibility = useCallback(
		(option: string) => {
			setVisibleGroup((prev) => toggleVisibility(prev, groupOptions, option));
		},
		[groupOptions],
	);

	const toggleSeriesVisibility = useCallback(
		(option: string) => {
			setVisibleSeries((prev) => toggleVisibility(prev, seriesOptions, option));
		},
		[seriesOptions],
	);

	const showAllGroup = useCallback(() => {
		setVisibleGroup([...groupOptions]);
	}, [groupOptions]);

	const showAllSeries = useCallback(() => {
		setVisibleSeries([...seriesOptions]);
	}, [seriesOptions]);

	const hideAllGroup = useCallback(() => {
		setVisibleGroup([]);
	}, []);

	const hideAllSeries = useCallback(() => {
		setVisibleSeries([]);
	}, []);

	return {
		visibleGroupOptions,
		visibleSeriesOptions,
		visibleGroupSet,
		visibleSeriesSet,
		hiddenGroupCount,
		hiddenSeriesCount,
		toggleGroupVisibility,
		toggleSeriesVisibility,
		showAllGroup,
		showAllSeries,
		hideAllGroup,
		hideAllSeries,
	};
}
