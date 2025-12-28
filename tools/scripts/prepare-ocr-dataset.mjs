import fs from "node:fs";
import path from "node:path";

const [inputPath, outputRoot = "ocr-dataset"] = process.argv.slice(2);

if (!inputPath) {
	console.error(
		"Usage: node scripts/prepare-ocr-dataset.mjs <dataset.json> [outputDir]",
	);
	process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf-8");
const payload = JSON.parse(raw);
const samples = Array.isArray(payload) ? payload : payload.samples;

if (!Array.isArray(samples)) {
	throw new Error("Invalid dataset format: missing samples array.");
}

const imagesDir = path.join(outputRoot, "images");
fs.mkdirSync(imagesDir, { recursive: true });

const labelsTsvPath = path.join(outputRoot, "labels.tsv");
const labelsStream = fs.createWriteStream(labelsTsvPath);
labelsStream.write(
	"file\tseriesSkill\tgroupSkill\tlanguage\trawText\ttableKey\tcursorId\n",
);

const decodeImage = (dataUrl) => {
	const prefix = "data:image/png;base64,";
	if (!dataUrl.startsWith(prefix)) {
		throw new Error("Unsupported image format. Expected PNG data URL.");
	}
	return Buffer.from(dataUrl.slice(prefix.length), "base64");
};

samples.forEach((sample, index) => {
	const safeId = String(sample.entryId ?? index).replace(/[^a-zA-Z0-9_-]/g, "");
	const fileBase = `sample-${index}-${safeId || "id"}`;
	const imagePath = path.join(imagesDir, `${fileBase}.png`);
	const gtPath = path.join(imagesDir, `${fileBase}.gt.txt`);

	const buffer = decodeImage(sample.imageDataUrl);
	fs.writeFileSync(imagePath, buffer);
	const seriesLabel = sample.labelSeries ?? sample.seriesSkill ?? "";
	const groupLabel = sample.labelGroup ?? sample.groupSkill ?? "";
	const combinedLabels = [seriesLabel, groupLabel]
		.map((value) => value.trim())
		.filter(Boolean);
	const combinedLabel =
		combinedLabels.length > 0 ? combinedLabels.join(" / ") : "不明";
	fs.writeFileSync(gtPath, `${combinedLabel}\n`);

	labelsStream.write(
		`${[
			`images/${fileBase}.png`,
			seriesLabel,
			groupLabel,
			sample.language ?? "",
			(sample.rawText ?? "").replace(/\s+/g, " ").trim(),
			sample.tableKey ?? "",
			String(sample.cursorId ?? ""),
		].join("\t")}\n`,
	);
});

labelsStream.end();
console.log(`Wrote ${samples.length} samples to ${outputRoot}`);
