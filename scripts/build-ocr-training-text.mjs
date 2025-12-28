import fs from "node:fs";

const [inputPath, outputPath = "ocr-dataset/training.txt"] =
	process.argv.slice(2);

if (!inputPath) {
	console.error(
		"Usage: node scripts/build-ocr-training-text.mjs <dataset.json> [outputFile]",
	);
	process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf-8");
const payload = JSON.parse(raw);
const samples = Array.isArray(payload) ? payload : payload.samples;

if (!Array.isArray(samples)) {
	throw new Error("Invalid dataset format: missing samples array.");
}

const lines = new Set();
for (const sample of samples) {
	const seriesLabel = sample.labelSeries || sample.seriesSkill;
	const groupLabel = sample.labelGroup || sample.groupSkill;
	if (seriesLabel) lines.add(seriesLabel);
	if (groupLabel) lines.add(groupLabel);
}

const sorted = Array.from(lines).sort((a, b) => a.localeCompare(b, "ja-JP"));
fs.writeFileSync(outputPath, `${sorted.join("\n")}\n`);
console.log(`Wrote ${sorted.length} lines to ${outputPath}`);
