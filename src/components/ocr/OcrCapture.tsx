import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LoggerMessage, Worker as TesseractWorker } from "tesseract.js";
import { useOcrCamera } from "../../hooks/useOcrCamera";
import {
	matchSkillFromText,
	matchSkillFromTextDetailed,
	type SkillMatch,
	preprocessCanvas,
} from "../../lib/ocr";
import {
	getSkillLabel,
	HIDDEN_SKILL_LABEL,
	UNKNOWN_SKILL_LABEL,
} from "../../lib/skills";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

type NormalizedRoi = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type OcrCaptureProps = {
	selectedTableKey: string;
	seriesOptions: string[];
	groupOptions: string[];
	disabled?: boolean;
	language: "ja" | "en";
	onAddEntry: (
		tableKey: string,
		groupSkill: string,
		seriesSkill: string,
	) => { id: string; cursorId: number };
	onUpdateEntry: (
		tableKey: string,
		entryId: string,
		updates: { groupSkill?: string; seriesSkill?: string },
	) => void;
};

const MAX_CAPTURE_WIDTH = 720;
const MIN_ROI_SIZE = 0.05;
const OCR_LANGUAGE = "jpn";
const AUTO_WAIT_TOKEN = "????? ?????";
const AUTO_WAIT_PLACEHOLDER_MIN = 2;
const AUTO_WAIT_PLACEHOLDER_RATIO = 0.3;
const AUTO_WAIT_PLACEHOLDER_RUN = 2;
const AUTO_WAIT_SHORT_LENGTH = 8;
const AUTO_SKILL_MIN_SUBSTRING = 2;
const AUTO_SKILL_MIN_BIGRAM = 2;
const AUTO_SKILL_MIN_MONOGRAM = 3;
const AUTO_SPEEDS = [
	{ key: "slow", ms: 2000 },
	{ key: "medium", ms: 1000 },
	{ key: "fast", ms: 500 },
] as const;
type AutoSpeedKey = (typeof AUTO_SPEEDS)[number]["key"];

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const normalizeAutoToken = (value: string) => value.replace(/\s+/g, "");

const isAutoWaitText = (value: string) => {
	const normalizedToken = normalizeAutoToken(AUTO_WAIT_TOKEN);
	const normalizedText = normalizeAutoToken(value);
	if (normalizedToken && normalizedText.includes(normalizedToken)) {
		return true;
	}
	const compact = value.replace(/\s+/g, "");
	if (!compact) return false;
	const runRegex = new RegExp(`[?？2]{${AUTO_WAIT_PLACEHOLDER_RUN},}`);
	const placeholderMatches = compact.match(/[?？2]/g);
	const placeholderCount = placeholderMatches?.length ?? 0;
	if (placeholderCount < AUTO_WAIT_PLACEHOLDER_MIN) return false;
	const placeholderRatio = placeholderCount / compact.length;
	if (compact.length <= AUTO_WAIT_SHORT_LENGTH && runRegex.test(compact)) {
		return true;
	}
	if (runRegex.test(compact))
		return placeholderRatio >= AUTO_WAIT_PLACEHOLDER_RATIO;
	return placeholderRatio >= AUTO_WAIT_PLACEHOLDER_RATIO;
};

const logOcrText = (source: "auto" | "manual", text: string) => {
	console.info(`[OCR:${source}]`, text);
};

const isSkillMatchStrong = (match: SkillMatch) => {
	if (match.mode === "substring") {
		return match.score >= AUTO_SKILL_MIN_SUBSTRING;
	}
	if (match.mode === "bigram") {
		return match.score >= AUTO_SKILL_MIN_BIGRAM;
	}
	if (match.mode === "monogram") {
		return match.score >= AUTO_SKILL_MIN_MONOGRAM;
	}
	return false;
};

const IconPlay = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
		<path d="M8 5v14l11-7z" />
	</svg>
);

const IconStop = (props: React.SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" {...props}>
		<rect x="6" y="6" width="12" height="12" rx="2" />
	</svg>
);

const buildRoi = (
	start: { x: number; y: number },
	current: { x: number; y: number },
) => {
	const x = Math.min(start.x, current.x);
	const y = Math.min(start.y, current.y);
	const width = Math.abs(current.x - start.x);
	const height = Math.abs(current.y - start.y);
	return { x, y, width, height };
};

const resolveRoiInVideo = (
	roi: NormalizedRoi,
	containerRect: DOMRect,
	videoWidth: number,
	videoHeight: number,
) => {
	const displayWidth = containerRect.width;
	const displayHeight = containerRect.height;
	const videoAspect = videoWidth / videoHeight;
	const displayAspect = displayWidth / displayHeight;

	let drawnWidth = displayWidth;
	let drawnHeight = displayHeight;
	let offsetX = 0;
	let offsetY = 0;

	if (videoAspect > displayAspect) {
		drawnWidth = displayWidth;
		drawnHeight = displayWidth / videoAspect;
		offsetY = (displayHeight - drawnHeight) / 2;
	} else {
		drawnHeight = displayHeight;
		drawnWidth = displayHeight * videoAspect;
		offsetX = (displayWidth - drawnWidth) / 2;
	}

	const roiDisplay = {
		x: roi.x * displayWidth - offsetX,
		y: roi.y * displayHeight - offsetY,
		width: roi.width * displayWidth,
		height: roi.height * displayHeight,
	};

	const clampedX = clamp(roiDisplay.x, 0, drawnWidth);
	const clampedY = clamp(roiDisplay.y, 0, drawnHeight);
	const clampedWidth = clamp(roiDisplay.width, 0, drawnWidth - clampedX);
	const clampedHeight = clamp(roiDisplay.height, 0, drawnHeight - clampedY);
	const scaleX = videoWidth / drawnWidth;
	const scaleY = videoHeight / drawnHeight;

	return {
		sx: Math.round(clampedX * scaleX),
		sy: Math.round(clampedY * scaleY),
		sw: Math.max(1, Math.round(clampedWidth * scaleX)),
		sh: Math.max(1, Math.round(clampedHeight * scaleY)),
	};
};

export function OcrCapture({
	selectedTableKey,
	seriesOptions,
	groupOptions,
	disabled = false,
	language,
	onAddEntry,
	onUpdateEntry,
}: OcrCaptureProps) {
	const { t } = useTranslation();
	const {
		stream,
		isActive,
		devices,
		selectedDeviceId,
		error: cameraError,
		start,
		stop,
		restart,
		setSelectedDeviceId,
	} = useOcrCamera();
	const [roi, setRoi] = useState<NormalizedRoi | null>(null);
	const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [isDragging, setIsDragging] = useState(false);
	const [ocrStatus, setOcrStatus] = useState<
		"idle" | "processing" | "success" | "error"
	>("idle");
	const [ocrProgress, setOcrProgress] = useState(0);
	const [ocrError, setOcrError] = useState("");
	const [autoMode, setAutoMode] = useState(false);
	const [autoState, setAutoState] = useState<"waiting" | "locked">("waiting");
	const [autoSpeed, setAutoSpeed] = useState<AutoSpeedKey>("medium");
	const [autoWaitSignal, setAutoWaitSignal] = useState(false);
	const [result, setResult] = useState<{
		entryId: string;
		cursorId: number;
		tableKey: string;
		seriesSkill: string;
		groupSkill: string;
		text: string;
	} | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const workerRef = useRef<TesseractWorker | null>(null);
	const workerPromiseRef = useRef<Promise<TesseractWorker> | null>(null);
	const autoInFlightRef = useRef(false);
	const hasWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;

	const roiReady =
		roi && roi.width >= MIN_ROI_SIZE && roi.height >= MIN_ROI_SIZE;
	const canCapture = roiReady && isActive && !disabled;
	const autoReady =
		autoMode && canCapture && Boolean(selectedTableKey) && !disabled;
	const autoIntervalMs =
		AUTO_SPEEDS.find((speed) => speed.key === autoSpeed)?.ms ?? 1000;
	const autoSpeedIndex = Math.max(
		0,
		AUTO_SPEEDS.findIndex((speed) => speed.key === autoSpeed),
	);

	const initWorker = useCallback(async () => {
		if (workerRef.current) return workerRef.current;
		if (workerPromiseRef.current) return workerPromiseRef.current;
		const { createWorker } = await import("tesseract.js");
		const promise = (async () => {
			const worker = await createWorker(OCR_LANGUAGE, 1, {
				logger: (message: LoggerMessage) => {
					if (message.status === "recognizing text") {
						setOcrProgress(Math.round(message.progress * 100));
					}
				},
			});
			workerRef.current = worker;
			return worker;
		})();
		workerPromiseRef.current = promise;
		try {
			return await promise;
		} finally {
			if (workerPromiseRef.current === promise) {
				workerPromiseRef.current = null;
			}
		}
	}, []);

	const handleStart = useCallback(async () => {
		setOcrStatus("idle");
		setOcrError("");
		setOcrProgress(0);
		await start();
		void initWorker().catch(() => {
			setOcrStatus("error");
			setOcrError(t("save.ocr.failed"));
		});
	}, [initWorker, start, t]);

	const handleStop = useCallback(() => {
		stop();
		setOcrProgress(0);
	}, [stop]);

	useEffect(() => {
		if (!autoMode) {
			setAutoState("waiting");
			autoInFlightRef.current = false;
			setAutoWaitSignal(false);
		}
	}, [autoMode]);

	useEffect(() => {
		return () => {
			if (workerRef.current) {
				workerRef.current.terminate();
				workerRef.current = null;
			}
			workerPromiseRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;
		}
	}, [stream]);

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!containerRef.current || disabled || !isActive) return;
		const rect = containerRef.current.getBoundingClientRect();
		const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
		const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
		setDragStart({ x, y });
		setRoi({ x, y, width: 0, height: 0 });
		setIsDragging(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!containerRef.current || !dragStart || !isDragging) return;
		const rect = containerRef.current.getBoundingClientRect();
		const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
		const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
		setRoi(buildRoi(dragStart, { x, y }));
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging) return;
		setIsDragging(false);
		setDragStart(null);
		event.currentTarget.releasePointerCapture(event.pointerId);
	};

	const captureCanvas = useCallback(() => {
		const video = videoRef.current;
		const container = containerRef.current;
		if (!video || !container || !roi || !video.videoWidth || !video.videoHeight)
			return null;
		const rect = container.getBoundingClientRect();
		const { sx, sy, sw, sh } = resolveRoiInVideo(
			roi,
			rect,
			video.videoWidth,
			video.videoHeight,
		);
		const targetWidth = Math.min(MAX_CAPTURE_WIDTH, sw);
		const scale = targetWidth / sw;
		const targetHeight = Math.max(1, Math.round(sh * scale));
		const canvas = document.createElement("canvas");
		canvas.width = targetWidth;
		canvas.height = targetHeight;
		const context = canvas.getContext("2d");
		if (!context) return null;
		context.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
		return canvas;
	}, [roi]);

	useEffect(() => {
		if (!autoMode || !selectedTableKey) return;
		setAutoState("waiting");
	}, [autoMode, selectedTableKey]);

	useEffect(() => {
		if (!autoReady) return;
		let cancelled = false;
		const intervalId = window.setInterval(() => {
			if (autoInFlightRef.current) return;
			autoInFlightRef.current = true;
			void (async () => {
				try {
					const rawCanvas = captureCanvas();
					if (!rawCanvas) return;
					const processedCanvas = await preprocessCanvas(rawCanvas, {
						threshold: 160,
					});
					const worker = await initWorker();
					const {
						data: { text },
					} = await worker.recognize(processedCanvas);
					logOcrText("auto", text);
					if (cancelled) return;

					const waitDetected = isAutoWaitText(text);
					setAutoWaitSignal((prev) =>
						prev === waitDetected ? prev : waitDetected,
					);
					if (waitDetected) {
						if (autoState !== "waiting") {
							setAutoState("waiting");
						}
						return;
					}
					const seriesMatch = matchSkillFromTextDetailed(text, seriesOptions);
					const groupMatch = matchSkillFromTextDetailed(text, groupOptions);
					const hasSkills =
						isSkillMatchStrong(seriesMatch) && isSkillMatchStrong(groupMatch);

					if (hasSkills) {
						if (autoState !== "waiting") return;
						const { id: entryId, cursorId } = onAddEntry(
							selectedTableKey,
							groupMatch.skill,
							seriesMatch.skill,
						);
						setResult({
							entryId,
							cursorId,
							tableKey: selectedTableKey,
							seriesSkill: seriesMatch.skill,
							groupSkill: groupMatch.skill,
							text,
						});
						setAutoState("locked");
						setOcrStatus("success");
					}
				} catch {
					if (!cancelled) {
						setOcrStatus("error");
						setOcrError(t("save.ocr.failed"));
					}
				} finally {
					autoInFlightRef.current = false;
				}
			})();
		}, autoIntervalMs);

		return () => {
			cancelled = true;
			window.clearInterval(intervalId);
			autoInFlightRef.current = false;
		};
	}, [
		autoIntervalMs,
		autoReady,
		autoState,
		captureCanvas,
		groupOptions,
		initWorker,
		onAddEntry,
		selectedTableKey,
		seriesOptions,
		t,
	]);

	const handleCapture = useCallback(async () => {
		if (!selectedTableKey) {
			setOcrStatus("error");
			setOcrError(t("save.ocr.tableMissing"));
			return;
		}
		if (!canCapture) {
			setOcrStatus("error");
			setOcrError(t("save.ocr.noRoi"));
			return;
		}
		setOcrError("");
		setOcrStatus("processing");
		setOcrProgress(0);
		setResult(null);
		try {
			const rawCanvas = captureCanvas();
			if (!rawCanvas) throw new Error("Capture failed");
			const processedCanvas = await preprocessCanvas(rawCanvas, {
				threshold: 160,
			});
			const worker = await initWorker();
			const {
				data: { text },
			} = await worker.recognize(processedCanvas);
			logOcrText("manual", text);
			const seriesSkill = matchSkillFromText(text, seriesOptions);
			const groupSkill = matchSkillFromText(text, groupOptions);
			const { id: entryId, cursorId } = onAddEntry(
				selectedTableKey,
				groupSkill,
				seriesSkill,
			);
			setResult({
				entryId,
				cursorId,
				tableKey: selectedTableKey,
				seriesSkill,
				groupSkill,
				text,
			});
			setOcrStatus("success");
		} catch {
			setOcrStatus("error");
			setOcrError(t("save.ocr.failed"));
		}
	}, [
		canCapture,
		captureCanvas,
		groupOptions,
		initWorker,
		onAddEntry,
		selectedTableKey,
		seriesOptions,
		t,
	]);

	const statusMessage = useMemo(() => {
		if (ocrStatus === "processing") {
			return ocrProgress > 0
				? t("save.ocr.progress", { value: ocrProgress })
				: t("save.ocr.processing");
		}
		if (ocrStatus === "success") return t("save.ocr.saved");
		if (ocrStatus === "error") return ocrError || t("save.ocr.failed");
		return "";
	}, [ocrError, ocrProgress, ocrStatus, t]);

	const autoIndicator = useMemo(() => {
		if (!autoMode || !canCapture || !selectedTableKey) {
			return null;
		}
		if (autoState === "locked") {
			return {
				className: "bg-amber-400",
				label: t("save.ocr.auto.locked"),
			};
		}
		if (autoWaitSignal) {
			return {
				className: "bg-emerald-400",
				label: t("save.ocr.auto.waitDetected"),
			};
		}
		return {
			className: "bg-slate-400/70",
			label: t("save.ocr.auto.waitingForToken"),
		};
	}, [autoMode, autoState, autoWaitSignal, canCapture, selectedTableKey, t]);

	const seriesSelectOptions = useMemo(
		() => [HIDDEN_SKILL_LABEL, ...seriesOptions],
		[seriesOptions],
	);
	const groupSelectOptions = useMemo(
		() => [HIDDEN_SKILL_LABEL, ...groupOptions],
		[groupOptions],
	);

	const deviceOptions = useMemo(() => {
		return devices.map((device, index) => ({
			id: device.deviceId,
			label:
				device.label ||
				t("save.ocr.cameraDeviceFallback", { value: index + 1 }),
		}));
	}, [devices, t]);

	const handleDeviceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const nextId = event.target.value;
		setSelectedDeviceId(nextId);
		if (isActive) {
			void restart(nextId || undefined);
		}
	};

	return (
		<div className="grid gap-4 rounded-2xl border border-border/40 bg-background p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="space-y-1">
					<div className="text-sm font-semibold">{t("save.ocr.title")}</div>
					<div className="text-xs text-muted-foreground">
						{t("save.ocr.description")}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>
						{hasWebGpu ? t("save.ocr.webgpuOn") : t("save.ocr.webgpuOff")}
					</span>
				</div>
			</div>

			<div className="grid gap-3">
				<div className="grid gap-2">
					<Label className="text-xs">{t("save.ocr.cameraDevice")}</Label>
					<div className="flex items-center gap-2">
						<Select
							value={selectedDeviceId}
							onChange={handleDeviceChange}
							className="h-9 flex-1 text-xs"
						>
							<option value="">{t("save.ocr.cameraAuto")}</option>
							{deviceOptions.map((device) => (
								<option key={device.id} value={device.id}>
									{device.label}
								</option>
							))}
						</Select>
						{!isActive ? (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleStart}
								disabled={disabled}
								aria-label={t("save.ocr.startCamera")}
								title={t("save.ocr.startCamera")}
							>
								<IconPlay className="h-6 w-6" />
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleStop}
								aria-label={t("save.ocr.stopCamera")}
								title={t("save.ocr.stopCamera")}
							>
								<IconStop className="h-6 w-6" />
							</Button>
						)}
					</div>
				</div>
				{cameraError && (
					<div className="text-xs text-rose-400">
						{t("save.ocr.cameraError")}
					</div>
				)}
				{!isActive && (
					<div className="text-xs text-muted-foreground">
						{t("save.ocr.idle")}
					</div>
				)}
				<div
					className="grid gap-2 rounded-xl border border-border/40 bg-background p-3"
					data-tour="save-ocr-auto"
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="space-y-1">
							<div className="text-sm font-semibold">
								{t("save.ocr.auto.title")}
							</div>
							<div className="text-xs text-muted-foreground">
								{t("save.ocr.auto.description")}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant={autoMode ? "default" : "outline"}
								size="sm"
								onClick={() => setAutoMode((prev) => !prev)}
								disabled={disabled}
							>
								{autoMode ? t("save.ocr.auto.on") : t("save.ocr.auto.off")}
							</Button>
							{autoIndicator && (
								<span
									className={cn(
										"h-2.5 w-2.5 rounded-full ring-2 ring-background",
										autoIndicator.className,
									)}
									role="img"
									aria-label={autoIndicator.label}
									title={autoIndicator.label}
								/>
							)}
						</div>
					</div>
					<div className="grid gap-2 text-xs">
						<div className="flex items-center justify-between gap-2">
							<Label htmlFor="ocr-auto-speed" className="text-xs">
								{t("save.ocr.auto.speedLabel")}
							</Label>
							<span className="text-xs text-muted-foreground">
								{t(`save.ocr.auto.speed.${autoSpeed}`)}
							</span>
						</div>
						<input
							id="ocr-auto-speed"
							type="range"
							min={0}
							max={AUTO_SPEEDS.length - 1}
							step={1}
							value={autoSpeedIndex}
							onChange={(event) => {
								const index = Number(event.target.value);
								const next = AUTO_SPEEDS[index]?.key ?? "medium";
								setAutoSpeed(next);
							}}
							className="h-2 w-full cursor-pointer accent-foreground"
						/>
						<div className="flex items-center justify-between text-[11px] text-muted-foreground">
							{AUTO_SPEEDS.map((speed) => (
								<span key={speed.key}>
									{t(`save.ocr.auto.speed.${speed.key}`)}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>

			{isActive && (
				<div className="grid gap-3">
					<div className="text-xs text-muted-foreground">
						{t("save.ocr.roiHelp")}
					</div>
					<div className="overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/30">
						<div
							ref={containerRef}
							className="relative w-full"
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
						>
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="h-80 w-full object-contain sm:h-[420px]"
							/>
							{roi && (
								<div
									className={cn(
										"absolute border border-emerald-400/70 bg-emerald-400/10",
										!roiReady && "border-rose-400/60 bg-rose-400/10",
									)}
									style={{
										left: `${roi.x * 100}%`,
										top: `${roi.y * 100}%`,
										width: `${roi.width * 100}%`,
										height: `${roi.height * 100}%`,
									}}
								/>
							)}
						</div>
						{roiReady && (
							<div className="flex items-center justify-center bg-black/90 py-3">
								<Button
									type="button"
									onClick={handleCapture}
									disabled={ocrStatus === "processing"}
									aria-label={t("save.ocr.shutter")}
									title={t("save.ocr.shutter")}
									className="aspect-square h-16 w-16 shrink-0 rounded-full bg-transparent p-0 shadow-none hover:bg-white/10"
								>
									<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white">
										<span className="h-8 w-8 rounded-full bg-white" />
									</span>
								</Button>
							</div>
						)}
					</div>
					{roiReady && (
						<div className="text-center text-xs text-muted-foreground">
							{statusMessage || t("save.ocr.ready")}
						</div>
					)}
				</div>
			)}

			{result && (
				<div className="grid gap-3">
					<div className="relative grid gap-2 rounded-xl border border-border/40 bg-background p-3 text-xs">
						{autoIndicator && (
							<span
								className={cn(
									"absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-background",
									autoIndicator.className,
								)}
								role="img"
								aria-label={autoIndicator.label}
								title={autoIndicator.label}
							/>
						)}
						<div className="text-xs font-semibold text-muted-foreground">
							{t("save.ocr.result")}
						</div>
						<div className="text-[11px] text-muted-foreground">
							{t("save.ocr.resultNote")}
						</div>
						<div className="grid gap-1">
							<div className="text-xs text-muted-foreground">
								{t("save.ocr.cursorId", { value: result.cursorId + 1 })}
							</div>
							<div>
								<Label className="text-xs">{t("save.ocr.series")}</Label>
								<Select
									value={result.seriesSkill}
									onChange={(event) => {
										const nextValue = event.target.value;
										setResult((prev) => {
											if (!prev) return prev;
											onUpdateEntry(prev.tableKey, prev.entryId, {
												seriesSkill: nextValue,
											});
											return { ...prev, seriesSkill: nextValue };
										});
									}}
									className="mt-1 h-9 text-xs"
								>
									{seriesSelectOptions.map((option) => (
										<option key={option} value={option}>
											{getSkillLabel(option, language)}
										</option>
									))}
								</Select>
							</div>
							<div>
								<Label className="text-xs">{t("save.ocr.group")}</Label>
								<Select
									value={result.groupSkill}
									onChange={(event) => {
										const nextValue = event.target.value;
										setResult((prev) => {
											if (!prev) return prev;
											onUpdateEntry(prev.tableKey, prev.entryId, {
												groupSkill: nextValue,
											});
											return { ...prev, groupSkill: nextValue };
										});
									}}
									className="mt-1 h-9 text-xs"
								>
									{groupSelectOptions.map((option) => (
										<option key={option} value={option}>
											{getSkillLabel(option, language)}
										</option>
									))}
								</Select>
							</div>
							<div className="text-[11px] text-muted-foreground">
								{t("save.ocr.rawText", {
									value: result?.text?.trim() || UNKNOWN_SKILL_LABEL,
								})}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
