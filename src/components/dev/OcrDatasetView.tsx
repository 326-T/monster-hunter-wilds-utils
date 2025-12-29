import { useEffect, useMemo, useRef, useState } from "react";
import type { OcrDatasetSample } from "../../lib/ocrDataset";
import {
	getSkillLabel,
	HIDDEN_SKILL_LABEL,
	UNKNOWN_SKILL_LABEL,
} from "../../lib/skills";
import { useOcrDataset } from "../../hooks/useOcrDataset";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

type OcrDatasetViewProps = {
	seriesOptions: string[];
	groupOptions: string[];
	language: "ja" | "en";
};

const PAGE_SIZE = 12;

const buildLabelOptions = (options: string[]) => {
	return Array.from(
		new Set([UNKNOWN_SKILL_LABEL, HIDDEN_SKILL_LABEL, ...options]),
	);
};

const formatTimestamp = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value || "-";
	return date.toLocaleString();
};

export function OcrDatasetView({
	seriesOptions,
	groupOptions,
	language,
}: OcrDatasetViewProps) {
	const {
		dataset,
		reviewedIds,
		reload,
		reloadReviewed,
		replaceDataset,
		replaceReviewedIds,
		toggleReviewed,
		updateSample,
	} = useOcrDataset({ enabled: true, listenUpdates: true });
	const [viewMode, setViewMode] = useState<"unreviewed" | "reviewed">(
		"unreviewed",
	);
	const [page, setPage] = useState(1);
	const importInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (dataset.length >= 0) {
			setPage(1);
		}
	}, [dataset.length]);

	useEffect(() => {
		const validIds = new Set(dataset.map((entry) => entry.entryId));
		const nextReviewed = reviewedIds.filter((id) => validIds.has(id));
		if (nextReviewed.length !== reviewedIds.length) {
			replaceReviewedIds(nextReviewed);
		}
	}, [dataset, replaceReviewedIds, reviewedIds]);

	const seriesLabelOptions = useMemo(
		() => buildLabelOptions(seriesOptions),
		[seriesOptions],
	);
	const groupLabelOptions = useMemo(
		() => buildLabelOptions(groupOptions),
		[groupOptions],
	);

	const dedupedSamples = useMemo(() => {
		const map = new Map<string, OcrDatasetSample>();
		for (const sample of dataset) {
			if (map.has(sample.entryId)) {
				map.delete(sample.entryId);
			}
			map.set(sample.entryId, sample);
		}
		return Array.from(map.values());
	}, [dataset]);

	const sortedSamples = useMemo(() => {
		return [...dedupedSamples].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}, [dedupedSamples]);

	const reviewedSet = useMemo(() => new Set(reviewedIds), [reviewedIds]);
	const unreviewedSamples = useMemo(
		() => sortedSamples.filter((sample) => !reviewedSet.has(sample.entryId)),
		[reviewedSet, sortedSamples],
	);
	const reviewedSamples = useMemo(
		() => sortedSamples.filter((sample) => reviewedSet.has(sample.entryId)),
		[reviewedSet, sortedSamples],
	);
	const activeSamples =
		viewMode === "unreviewed" ? unreviewedSamples : reviewedSamples;
	const totalPages = Math.max(1, Math.ceil(activeSamples.length / PAGE_SIZE));
	const pageSamples = activeSamples.slice(
		(page - 1) * PAGE_SIZE,
		page * PAGE_SIZE,
	);

	const handleReload = () => {
		void reload().then(() => {
			setPage(1);
		});
		void reloadReviewed();
	};

	const handleExport = async () => {
		const payload = {
			version: 1,
			createdAt: new Date().toISOString(),
			samples: dedupedSamples,
			reviewedIds,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		link.download = `mhwu-ocr-labeling-${timestamp}.json`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const parsed = JSON.parse(String(reader.result || "{}")) as {
					samples?: OcrDatasetSample[];
					reviewedIds?: string[];
				};
				if (Array.isArray(parsed.samples)) {
					replaceDataset(parsed.samples);
				}
				if (Array.isArray(parsed.reviewedIds)) {
					replaceReviewedIds(parsed.reviewedIds.filter(Boolean));
				}
				setPage(1);
			} catch {
				// ignore invalid files
			}
		};
		reader.readAsText(file);
		event.target.value = "";
	};

	const handleImportClick = () => {
		importInputRef.current?.click();
	};

	const handleToggleReviewed = (entryId: string, nextValue: boolean) => {
		toggleReviewed(entryId, nextValue);
	};

	const handleMarkPageReviewed = () => {
		if (viewMode !== "unreviewed") return;
		const next = new Set(reviewedIds);
		for (const sample of pageSamples) {
			next.add(sample.entryId);
		}
		replaceReviewedIds(Array.from(next));
	};

	useEffect(() => {
		if (viewMode) {
			setPage(1);
		}
	}, [viewMode]);

	useEffect(() => {
		setPage((prev) => Math.min(Math.max(1, prev), totalPages));
	}, [totalPages]);

	const updateLabel = (
		entryId: string,
		key: "labelSeries" | "labelGroup",
		value: string,
	) => {
		updateSample(entryId, { [key]: value });
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="mx-auto max-w-6xl px-6 py-10">
				<div className="grid gap-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="space-y-1">
							<h1 className="text-lg font-semibold">OCR Dataset (Dev)</h1>
							<p className="text-xs text-muted-foreground">
								Labels are stored for training only and do not affect the app
								state.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant={viewMode === "unreviewed" ? "default" : "outline"}
								size="sm"
								onClick={() => setViewMode("unreviewed")}
							>
								Unreviewed ({unreviewedSamples.length})
							</Button>
							<Button
								variant={viewMode === "reviewed" ? "default" : "outline"}
								size="sm"
								onClick={() => setViewMode("reviewed")}
							>
								Reviewed ({reviewedSamples.length})
							</Button>
							<Button variant="outline" size="sm" onClick={handleReload}>
								Reload
							</Button>
							<Button variant="outline" size="sm" onClick={handleExport}>
								Export
							</Button>
							<input
								ref={importInputRef}
								type="file"
								accept="application/json"
								onChange={handleImport}
								className="hidden"
							/>
							<Button
								variant="outline"
								size="sm"
								type="button"
								onClick={handleImportClick}
							>
								Import
							</Button>
						</div>
					</div>

					<div className="grid gap-4">
						{pageSamples.length === 0 ? (
							<div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
								No samples for this view.
							</div>
						) : (
							pageSamples.map((sample) => {
								const seriesValue =
									sample.labelSeries ||
									sample.seriesSkill ||
									UNKNOWN_SKILL_LABEL;
								const groupValue =
									sample.labelGroup || sample.groupSkill || UNKNOWN_SKILL_LABEL;
								const seriesSelectId = `ocr-label-series-${sample.entryId}`;
								const groupSelectId = `ocr-label-group-${sample.entryId}`;
								const seriesOptionsForSample = seriesLabelOptions.includes(
									seriesValue,
								)
									? seriesLabelOptions
									: [seriesValue, ...seriesLabelOptions];
								const groupOptionsForSample = groupLabelOptions.includes(
									groupValue,
								)
									? groupLabelOptions
									: [groupValue, ...groupLabelOptions];

								return (
									<div
										key={sample.entryId}
										className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4 md:grid-cols-[220px_1fr]"
									>
										<div className="overflow-hidden rounded-xl border border-border/40 bg-muted/30">
											<img
												src={sample.imageDataUrl}
												alt={`OCR sample ${sample.entryId}`}
												className="h-full w-full object-contain"
												loading="lazy"
											/>
										</div>
										<div className="grid gap-3 text-xs">
											<div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
												<div className="flex flex-wrap items-center gap-2">
													<span>Cursor: {sample.cursorId + 1}</span>
													<span>Table: {sample.tableKey}</span>
													<span>Lang: {sample.language}</span>
													<span>Source: {sample.source}</span>
													<span>
														Saved: {formatTimestamp(sample.createdAt)}
													</span>
												</div>
												<Button
													variant={
														reviewedSet.has(sample.entryId)
															? "default"
															: "outline"
													}
													size="sm"
													onClick={() =>
														handleToggleReviewed(
															sample.entryId,
															!reviewedSet.has(sample.entryId),
														)
													}
												>
													{reviewedSet.has(sample.entryId)
														? "Reviewed"
														: "Mark reviewed"}
												</Button>
											</div>
											<div className="grid gap-2">
												<div className="grid gap-1">
													<Label
														className="text-[11px] text-muted-foreground"
														htmlFor={seriesSelectId}
													>
														Label (Series)
													</Label>
													<Select
														id={seriesSelectId}
														value={seriesValue}
														onChange={(event) =>
															updateLabel(
																sample.entryId,
																"labelSeries",
																event.target.value,
															)
														}
														className="h-9 text-xs"
													>
														{seriesOptionsForSample.map((option) => (
															<option key={option} value={option}>
																{getSkillLabel(option, language)}
															</option>
														))}
													</Select>
												</div>
												<div className="grid gap-1">
													<Label
														className="text-[11px] text-muted-foreground"
														htmlFor={groupSelectId}
													>
														Label (Group)
													</Label>
													<Select
														id={groupSelectId}
														value={groupValue}
														onChange={(event) =>
															updateLabel(
																sample.entryId,
																"labelGroup",
																event.target.value,
															)
														}
														className="h-9 text-xs"
													>
														{groupOptionsForSample.map((option) => (
															<option key={option} value={option}>
																{getSkillLabel(option, language)}
															</option>
														))}
													</Select>
												</div>
											</div>
											<div className="grid gap-1 text-muted-foreground">
												<span className="text-[11px]">
													Recorded series: {sample.seriesSkill}
												</span>
												<span className="text-[11px]">
													Recorded group: {sample.groupSkill}
												</span>
												<span className="text-[11px]">
													Raw text: {sample.rawText.trim() || "-"}
												</span>
											</div>
										</div>
									</div>
								);
							})
						)}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-4 text-xs">
						<div className="text-muted-foreground">
							Page {page} / {totalPages} · {activeSamples.length} samples
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((prev) => Math.max(1, prev - 1))}
								disabled={page <= 1}
							>
								Prev
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setPage((prev) => Math.min(totalPages, prev + 1))
								}
								disabled={page >= totalPages}
							>
								Next
							</Button>
							{viewMode === "unreviewed" && pageSamples.length > 0 && (
								<Button size="sm" onClick={handleMarkPageReviewed}>
									Mark page reviewed
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
