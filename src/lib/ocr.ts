import { getSkillLabel, UNKNOWN_SKILL_LABEL } from "./skills";

const NORMALIZE_PATTERN =
	/[\s\r\n\t"'“”‘’`~!@#$%^&*()_+\-=[\]{}|\\:;,./?<>\u3001\u3002\u30fb「」『』（）【】［］｛｝]/g;
const MAX_WEBGPU_ATTEMPTS = 1;

type MatchResult = {
	skill: string;
	length: number;
	score: number;
};

export type SkillMatch = {
	skill: string;
	score: number;
	length: number;
	mode: "substring" | "bigram" | "monogram" | "none";
};

const buildBigramCounts = (text: string) => {
	const counts = new Map<string, number>();
	if (text.length < 2) return counts;
	for (let i = 0; i < text.length - 1; i += 1) {
		const bigram = text.slice(i, i + 2);
		counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
	}
	return counts;
};

const countBigramOverlap = (source: string, target: string) => {
	if (!source || !target) return 0;
	const sourceCounts = buildBigramCounts(source);
	if (sourceCounts.size === 0) return 0;
	let score = 0;
	for (let i = 0; i < target.length - 1; i += 1) {
		const bigram = target.slice(i, i + 2);
		const count = sourceCounts.get(bigram) ?? 0;
		if (count > 0) {
			score += 1;
			sourceCounts.set(bigram, count - 1);
		}
	}
	return score;
};

const countMonogramOverlap = (source: string, target: string) => {
	if (!source || !target) return 0;
	const sourceCounts = new Map<string, number>();
	for (const char of source) {
		sourceCounts.set(char, (sourceCounts.get(char) ?? 0) + 1);
	}
	let score = 0;
	for (const char of target) {
		const count = sourceCounts.get(char) ?? 0;
		if (count > 0) {
			score += 1;
			sourceCounts.set(char, count - 1);
		}
	}
	return score;
};

export const normalizeOcrText = (value: string) =>
	value.normalize("NFKC").toLowerCase().replace(NORMALIZE_PATTERN, "");

export const matchSkillFromText = (text: string, options: string[]): string => {
	const match = matchSkillFromTextDetailed(text, options);
	return match.skill;
};

export const matchSkillFromTextDetailed = (
	text: string,
	options: string[],
): SkillMatch => {
	const normalizedText = normalizeOcrText(text);
	if (!normalizedText) {
		return {
			skill: UNKNOWN_SKILL_LABEL,
			score: 0,
			length: 0,
			mode: "none",
		};
	}

	let bestSubstring: MatchResult = { skill: "", length: 0, score: 0 };
	let bestScore: MatchResult = { skill: "", length: 0, score: 0 };
	let bestMonoScore: MatchResult = { skill: "", length: 0, score: 0 };
	for (const option of options) {
		const variants = new Set([
			option,
			getSkillLabel(option, "en"),
			getSkillLabel(option, "ja"),
		]);
		let bestOptionSubstringLength = 0;
		let bestOptionScore = 0;
		let bestOptionLength = 0;
		let bestOptionMonoScore = 0;
		let bestOptionMonoLength = 0;
		for (const variant of variants) {
			if (!variant) continue;
			const normalizedVariant = normalizeOcrText(variant);
			if (!normalizedVariant) continue;
			if (normalizedText.includes(normalizedVariant)) {
				if (normalizedVariant.length > bestOptionSubstringLength) {
					bestOptionSubstringLength = normalizedVariant.length;
				}
				continue;
			}
			const score = countBigramOverlap(normalizedText, normalizedVariant);
			if (score > bestOptionScore) {
				bestOptionScore = score;
				bestOptionLength = normalizedVariant.length;
			}
			const monoScore = countMonogramOverlap(normalizedText, normalizedVariant);
			if (monoScore > bestOptionMonoScore) {
				bestOptionMonoScore = monoScore;
				bestOptionMonoLength = normalizedVariant.length;
			}
		}

		if (bestOptionSubstringLength > 0) {
			if (bestOptionSubstringLength > bestSubstring.length) {
				bestSubstring = {
					skill: option,
					length: bestOptionSubstringLength,
					score: bestOptionSubstringLength,
				};
			}
			continue;
		}

		if (bestOptionScore > bestScore.score) {
			bestScore = {
				skill: option,
				length: bestOptionLength,
				score: bestOptionScore,
			};
		} else if (
			bestOptionScore === bestScore.score &&
			bestOptionLength > bestScore.length
		) {
			bestScore = {
				skill: option,
				length: bestOptionLength,
				score: bestOptionScore,
			};
		}

		if (bestOptionMonoScore > bestMonoScore.score) {
			bestMonoScore = {
				skill: option,
				length: bestOptionMonoLength,
				score: bestOptionMonoScore,
			};
		} else if (
			bestOptionMonoScore === bestMonoScore.score &&
			bestOptionMonoLength > bestMonoScore.length
		) {
			bestMonoScore = {
				skill: option,
				length: bestOptionMonoLength,
				score: bestOptionMonoScore,
			};
		}
	}

	if (bestSubstring.skill) {
		return {
			skill: bestSubstring.skill,
			score: bestSubstring.length,
			length: bestSubstring.length,
			mode: "substring",
		};
	}
	if (bestScore.score >= 1) {
		return {
			skill: bestScore.skill,
			score: bestScore.score,
			length: bestScore.length,
			mode: "bigram",
		};
	}
	if (bestMonoScore.score >= 1) {
		return {
			skill: bestMonoScore.skill,
			score: bestMonoScore.score,
			length: bestMonoScore.length,
			mode: "monogram",
		};
	}
	return {
		skill: UNKNOWN_SKILL_LABEL,
		score: 0,
		length: 0,
		mode: "none",
	};
};

const binarizeOnCpu = (canvas: HTMLCanvasElement, threshold: number) => {
	const context = canvas.getContext("2d");
	if (!context) return canvas;
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const luma = 0.299 * r + 0.587 * g + 0.114 * b;
		const value = luma >= threshold ? 255 : 0;
		data[i] = value;
		data[i + 1] = value;
		data[i + 2] = value;
	}
	context.putImageData(imageData, 0, 0);
	return canvas;
};

const binarizeWithWebGpu = async (
	canvas: HTMLCanvasElement,
	threshold: number,
) => {
	const context = canvas.getContext("2d");
	const gpu = (
		navigator as { gpu?: { requestAdapter: () => Promise<unknown> } }
	).gpu;
	if (!context || !gpu) {
		return binarizeOnCpu(canvas, threshold);
	}
	const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	const pixelCount = imageData.data.length / 4;
	let attempts = 0;
	const gpuBufferUsage = (
		globalThis as { GPUBufferUsage?: Record<string, number> }
	).GPUBufferUsage;
	const gpuMapMode = (globalThis as { GPUMapMode?: Record<string, number> })
		.GPUMapMode;

	if (!gpuBufferUsage || !gpuMapMode) {
		return binarizeOnCpu(canvas, threshold);
	}

	while (attempts < MAX_WEBGPU_ATTEMPTS) {
		attempts += 1;
		try {
			const adapter = (await gpu.requestAdapter()) as {
				requestDevice?: () => Promise<unknown>;
			} | null;
			if (!adapter?.requestDevice) throw new Error("No GPU adapter");
			const device = (await adapter.requestDevice()) as {
				createBuffer: (options: { size: number; usage: number }) => unknown;
				createShaderModule: (options: { code: string }) => unknown;
				createComputePipeline: (options: {
					layout: "auto";
					compute: { module: unknown; entryPoint: string };
				}) => { getBindGroupLayout: (index: number) => unknown };
				createBindGroup: (options: {
					layout: unknown;
					entries: Array<{ binding: number; resource: { buffer: unknown } }>;
				}) => unknown;
				createCommandEncoder: () => unknown;
				queue: {
					writeBuffer: (
						buffer: unknown,
						offset: number,
						data: BufferSource,
					) => void;
					submit: (commands: unknown[]) => void;
				};
			};
			const byteLength = imageData.data.byteLength;
			const storageBuffer = device.createBuffer({
				size: byteLength,
				usage:
					gpuBufferUsage.STORAGE |
					gpuBufferUsage.COPY_DST |
					gpuBufferUsage.COPY_SRC,
			});
			device.queue.writeBuffer(storageBuffer, 0, imageData.data.buffer);
			const paramBuffer = device.createBuffer({
				size: 16,
				usage: gpuBufferUsage.UNIFORM | gpuBufferUsage.COPY_DST,
			});
			device.queue.writeBuffer(
				paramBuffer,
				0,
				new Uint32Array([pixelCount, threshold, 0, 0]),
			);
			const shaderModule = device.createShaderModule({
				code: `
          struct Params {
            count: u32,
            threshold: u32,
            _pad0: u32,
            _pad1: u32,
          };
          @group(0) @binding(0) var<storage, read_write> data: array<u32>;
          @group(0) @binding(1) var<uniform> params: Params;

          @compute @workgroup_size(64)
          fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
            let idx = gid.x;
            if (idx >= params.count) {
              return;
            }
            let pixel = data[idx];
            let r = f32(pixel & 0xFFu);
            let g = f32((pixel >> 8u) & 0xFFu);
            let b = f32((pixel >> 16u) & 0xFFu);
            let luma = 0.299 * r + 0.587 * g + 0.114 * b;
            let v = select(0u, 255u, luma >= f32(params.threshold));
            data[idx] = (pixel & 0xFF000000u) | (v << 16u) | (v << 8u) | v;
          }
        `,
			});
			const pipeline = device.createComputePipeline({
				layout: "auto",
				compute: {
					module: shaderModule,
					entryPoint: "main",
				},
			});
			const bindGroup = device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: storageBuffer } },
					{ binding: 1, resource: { buffer: paramBuffer } },
				],
			});
			const commandEncoder = device.createCommandEncoder();
			const passEncoder = (
				commandEncoder as {
					beginComputePass: () => {
						setPipeline: (pipeline: unknown) => void;
						setBindGroup: (index: number, group: unknown) => void;
						dispatchWorkgroups: (countX: number) => void;
						end: () => void;
					};
				}
			).beginComputePass();
			passEncoder.setPipeline(pipeline);
			passEncoder.setBindGroup(0, bindGroup);
			passEncoder.dispatchWorkgroups(Math.ceil(pixelCount / 64));
			passEncoder.end();
			const readBuffer = device.createBuffer({
				size: byteLength,
				usage: gpuBufferUsage.COPY_DST | gpuBufferUsage.MAP_READ,
			});
			const encoder = commandEncoder as {
				copyBufferToBuffer: (
					source: unknown,
					sourceOffset: number,
					destination: unknown,
					destinationOffset: number,
					size: number,
				) => void;
				finish: () => unknown;
			};
			encoder.copyBufferToBuffer(storageBuffer, 0, readBuffer, 0, byteLength);
			device.queue.submit([encoder.finish()]);
			const mapped = readBuffer as {
				mapAsync: (mode: number) => Promise<void>;
				getMappedRange: () => ArrayBuffer;
				unmap: () => void;
			};
			await mapped.mapAsync(gpuMapMode.READ);
			const copy = new Uint8Array(mapped.getMappedRange());
			imageData.data.set(copy);
			mapped.unmap();
			context.putImageData(imageData, 0, 0);
			return canvas;
		} catch {
			// Fallback to CPU if WebGPU fails.
			break;
		}
	}

	return binarizeOnCpu(canvas, threshold);
};

export const preprocessCanvas = async (
	canvas: HTMLCanvasElement,
	options?: { threshold?: number },
) => {
	const threshold = options?.threshold ?? 160;
	return binarizeWithWebGpu(canvas, threshold);
};
