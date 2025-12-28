export type OcrDatasetSample = {
	entryId: string;
	createdAt: string;
	language: "ja" | "en";
	tableKey: string;
	cursorId: number;
	seriesSkill: string;
	groupSkill: string;
	labelSeries: string;
	labelGroup: string;
	rawText: string;
	imageDataUrl: string;
	source: "auto" | "manual";
};

export const OCR_DATASET_KEY = "mhwu.ocr.dataset.v1";

export const loadDataset = () => {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(OCR_DATASET_KEY);
		if (!raw) return [];
		const data = JSON.parse(raw) as OcrDatasetSample[];
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
};

export const saveDataset = (samples: OcrDatasetSample[]) => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(OCR_DATASET_KEY, JSON.stringify(samples));
};

export const exportDataset = () => {
	if (typeof window === "undefined") return;
	const payload = {
		version: 1,
		createdAt: new Date().toISOString(),
		samples: loadDataset(),
	};
	const blob = new Blob([JSON.stringify(payload, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	link.download = `mhwu-ocr-dataset-${timestamp}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
};

export const clearDataset = () => {
	saveDataset([]);
};

export const getDataset = () => loadDataset();
