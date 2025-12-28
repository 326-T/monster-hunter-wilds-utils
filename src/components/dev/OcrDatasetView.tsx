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

	useEffect(() => {
		saveDataset(dataset);
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

	const handleReload = () => {
		setDataset(loadDataset());
	};

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
							<Button variant="outline" size="sm" onClick={handleReload}>
								Reload
							</Button>
						</div>
					</div>

					<div className="grid gap-4">
						{sortedSamples.length === 0 ? (
							<div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
								No OCR dataset samples yet.
							</div>
						) : (
							sortedSamples.map((sample) => {
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
											<div className="flex flex-wrap items-center gap-2 text-muted-foreground">
												<span>Cursor: {sample.cursorId + 1}</span>
												<span>Table: {sample.tableKey}</span>
												<span>Lang: {sample.language}</span>
												<span>Source: {sample.source}</span>
											</div>
											<div className="grid gap-2 sm:grid-cols-2">
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
				</div>
			</div>
		</div>
	);
}
