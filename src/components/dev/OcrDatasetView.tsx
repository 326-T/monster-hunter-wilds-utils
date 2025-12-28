import { useEffect, useMemo, useState } from "react";
import {
	loadDataset,
	saveDataset,
	type OcrDatasetSample,
} from "../../lib/ocrDataset";
import {
	getSkillLabel,
	HIDDEN_SKILL_LABEL,
	UNKNOWN_SKILL_LABEL,
} from "../../lib/skills";
import { Button } from "../ui/button";
import { Select } from "../ui/select";

type OcrDatasetViewProps = {
	seriesOptions: string[];
	groupOptions: string[];
	language: "ja" | "en";
};

const REVIEWED_KEY = "mhwu.ocr.dataset.reviewed.v1";
const PAGE_SIZE = 12;

const buildLabelOptions = (options: string[]) => {
	return Array.from(
		new Set([UNKNOWN_SKILL_LABEL, HIDDEN_SKILL_LABEL, ...options]),
	);
};

export function OcrDatasetView({
	seriesOptions,
	groupOptions,
	language,
}: OcrDatasetViewProps) {
	const [dataset, setDataset] = useState<OcrDatasetSample[]>(() =>
		loadDataset(),
	);
	const [reviewedIds, setReviewedIds] = useState<string[]>([]);
	const [viewMode, setViewMode] = useState<"unreviewed" | "reviewed">(
		"unreviewed",
	);
	const [page, setPage] = useState(1);

	useEffect(() => {
		saveDataset(dataset);
	}, [dataset]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const raw = window.localStorage.getItem(REVIEWED_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as string[];
			if (Array.isArray(parsed)) {
				setReviewedIds(parsed.filter(Boolean));
			}
		} catch {
			setReviewedIds([]);
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(REVIEWED_KEY, JSON.stringify(reviewedIds));
	}, [reviewedIds]);

	useEffect(() => {
		setReviewedIds((prev) => {
			const validIds = new Set(dataset.map((entry) => entry.entryId));
			return prev.filter((id) => validIds.has(id));
		});
	}, [dataset]);

	const seriesLabelOptions = useMemo(
		() => buildLabelOptions(seriesOptions),
		[seriesOptions],
	);
	const groupLabelOptions = useMemo(
		() => buildLabelOptions(groupOptions),
		[groupOptions],
	);

	const sortedSamples = useMemo(() => {
		return [...dataset].sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}, [dataset]);

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
		setDataset(loadDataset());
	};

	const handleToggleReviewed = (entryId: string, nextValue: boolean) => {
		setReviewedIds((prev) => {
			if (nextValue) {
				return prev.includes(entryId) ? prev : [...prev, entryId];
			}
			return prev.filter((id) => id !== entryId);
		});
	};

	const handleMarkPageReviewed = () => {
		if (viewMode !== "unreviewed") return;
		setReviewedIds((prev) => {
			const next = new Set(prev);
			pageSamples.forEach((sample) => {
				next.add(sample.entryId);
			});
			return Array.from(next);
		});
	};

	useEffect(() => {
		setPage(1);
	}, [viewMode]);

	useEffect(() => {
		setPage((prev) => Math.min(Math.max(1, prev), totalPages));
	}, [totalPages]);

	const updateLabel = (
		entryId: string,
		key: "labelSeries" | "labelGroup",
		value: string,
	) => {
		setDataset((prev) =>
			prev.map((entry) =>
				entry.entryId === entryId ? { ...entry, [key]: value } : entry,
			),
		);
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
									sample.labelSeries || sample.seriesSkill || UNKNOWN_SKILL_LABEL;
								const groupValue =
									sample.labelGroup || sample.groupSkill || UNKNOWN_SKILL_LABEL;
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
												</div>
												<Button
													variant={reviewedSet.has(sample.entryId) ? "default" : "outline"}
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
												<label className="grid gap-1">
													<span className="text-[11px] text-muted-foreground">
														Label (Series)
													</span>
													<Select
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
												</label>
												<label className="grid gap-1">
													<span className="text-[11px] text-muted-foreground">
														Label (Group)
													</span>
													<Select
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
												</label>
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
