import { useCallback, useEffect, useMemo, useState } from "react";
import {
	loadDataset,
	loadDatasetAsync,
	reloadDatasetAsync,
	saveDataset,
	loadReviewedIdsAsync,
	reloadReviewedIdsAsync,
	saveReviewedIds,
	type OcrDatasetSample,
} from "../lib/ocrDataset";

type UseOcrDatasetOptions = {
	enabled?: boolean;
	listenUpdates?: boolean;
};

const dedupeSamples = (samples: OcrDatasetSample[]) => {
	const map = new Map<string, OcrDatasetSample>();
	for (const sample of samples) {
		map.set(sample.entryId, sample);
	}
	return Array.from(map.values());
};

const dedupeIds = (ids: string[]) => Array.from(new Set(ids));

export const useOcrDataset = (options: UseOcrDatasetOptions = {}) => {
	const enabled = options.enabled ?? true;
	const listenUpdates = options.listenUpdates ?? false;
	const [dataset, setDataset] = useState<OcrDatasetSample[]>(() =>
		enabled ? loadDataset() : [],
	);
	const [reviewedIds, setReviewedIds] = useState<string[]>([]);
	const [datasetReady, setDatasetReady] = useState(!enabled);
	const [reviewedReady, setReviewedReady] = useState(!enabled);

	useEffect(() => {
		if (!enabled) return;
		let active = true;
		void loadDatasetAsync().then((data) => {
			if (!active) return;
			setDataset(dedupeSamples(data));
			setDatasetReady(true);
		});
		return () => {
			active = false;
		};
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;
		let active = true;
		void loadReviewedIdsAsync().then((ids) => {
			if (!active) return;
			setReviewedIds(dedupeIds(ids));
			setReviewedReady(true);
		});
		return () => {
			active = false;
		};
	}, [enabled]);

	useEffect(() => {
		if (!enabled || !datasetReady) return;
		saveDataset(dataset);
	}, [dataset, datasetReady, enabled]);

	useEffect(() => {
		if (!enabled || !reviewedReady) return;
		saveReviewedIds(reviewedIds);
	}, [reviewedIds, reviewedReady, enabled]);

	useEffect(() => {
		if (!enabled || !listenUpdates) return;
		const handleUpdate = () => {
			void reloadDatasetAsync().then((data) => {
				setDataset(dedupeSamples(data));
				setDatasetReady(true);
			});
		};
		window.addEventListener("mhwu-ocr-dataset-updated", handleUpdate);
		return () => {
			window.removeEventListener("mhwu-ocr-dataset-updated", handleUpdate);
		};
	}, [enabled, listenUpdates]);

	const reload = useCallback(async () => {
		const data = await reloadDatasetAsync();
		setDataset(dedupeSamples(data));
		setDatasetReady(true);
	}, []);

	const reloadReviewed = useCallback(async () => {
		const ids = await reloadReviewedIdsAsync();
		setReviewedIds(dedupeIds(ids));
		setReviewedReady(true);
	}, []);

	const addSample = useCallback((sample: OcrDatasetSample) => {
		setDataset((prev) => [
			sample,
			...prev.filter((entry) => entry.entryId !== sample.entryId),
		]);
	}, []);

	const updateSample = useCallback(
		(entryId: string, updates: Partial<OcrDatasetSample>) => {
			setDataset((prev) =>
				prev.map((entry) =>
					entry.entryId === entryId ? { ...entry, ...updates } : entry,
				),
			);
		},
		[],
	);

	const removeSample = useCallback((entryId: string) => {
		setDataset((prev) => prev.filter((entry) => entry.entryId !== entryId));
	}, []);

	const replaceDataset = useCallback((samples: OcrDatasetSample[]) => {
		setDataset(dedupeSamples(samples));
		setDatasetReady(true);
	}, []);

	const replaceReviewedIds = useCallback((ids: string[]) => {
		setReviewedIds(dedupeIds(ids));
		setReviewedReady(true);
	}, []);

	const toggleReviewed = useCallback((entryId: string, nextValue: boolean) => {
		setReviewedIds((prev) => {
			const set = new Set(prev);
			if (nextValue) {
				set.add(entryId);
			} else {
				set.delete(entryId);
			}
			return Array.from(set);
		});
	}, []);

	const ready = useMemo(
		() => datasetReady && reviewedReady,
		[datasetReady, reviewedReady],
	);

	return {
		dataset,
		reviewedIds,
		datasetReady,
		reviewedReady,
		ready,
		reload,
		reloadReviewed,
		addSample,
		updateSample,
		removeSample,
		replaceDataset,
		replaceReviewedIds,
		toggleReviewed,
	};
};
