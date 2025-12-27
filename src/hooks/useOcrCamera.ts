import { useCallback, useEffect, useRef, useState } from "react";

type OcrCameraState = {
	stream: MediaStream | null;
	isActive: boolean;
	devices: MediaDeviceInfo[];
	selectedDeviceId: string;
	error: string;
	start: (deviceId?: string) => Promise<void>;
	stop: () => void;
	refreshDevices: () => Promise<void>;
	setSelectedDeviceId: (deviceId: string) => void;
	restart: (deviceId?: string) => Promise<void>;
};

export const useOcrCamera = (): OcrCameraState => {
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedDeviceId, setSelectedDeviceIdState] = useState("");
	const [error, setError] = useState("");
	const streamRef = useRef<MediaStream | null>(null);
	const selectedDeviceRef = useRef("");

	const stop = useCallback(() => {
		const tracks = streamRef.current?.getTracks() ?? [];
		for (const track of tracks) {
			track.stop();
		}
		streamRef.current = null;
		setStream(null);
	}, []);

	const refreshDevices = useCallback(async () => {
		if (!navigator.mediaDevices?.enumerateDevices) {
			setDevices([]);
			return;
		}
		const list = await navigator.mediaDevices.enumerateDevices();
		const videoInputs = list.filter((device) => device.kind === "videoinput");
		setDevices(videoInputs);
		if (
			selectedDeviceRef.current &&
			!videoInputs.some(
				(device) => device.deviceId === selectedDeviceRef.current,
			)
		) {
			selectedDeviceRef.current = "";
			setSelectedDeviceIdState("");
		}
	}, []);

	const start = useCallback(
		async (deviceId?: string) => {
			try {
				setError("");
				if (!navigator.mediaDevices?.getUserMedia) {
					throw new Error("MediaDevices not available");
				}
				const resolvedDeviceId = deviceId ?? selectedDeviceRef.current;
				const videoConstraint = resolvedDeviceId
					? { deviceId: { exact: resolvedDeviceId } }
					: { facingMode: "environment" };
				const nextStream = await navigator.mediaDevices.getUserMedia({
					video: videoConstraint,
					audio: false,
				});
				streamRef.current = nextStream;
				setStream(nextStream);
				await refreshDevices();
			} catch {
				setError("camera");
				stop();
			}
		},
		[refreshDevices, stop],
	);

	const restart = useCallback(
		async (deviceId?: string) => {
			stop();
			await start(deviceId);
		},
		[start, stop],
	);

	const setSelectedDeviceId = useCallback((deviceId: string) => {
		selectedDeviceRef.current = deviceId;
		setSelectedDeviceIdState(deviceId);
	}, []);

	useEffect(() => {
		return () => stop();
	}, [stop]);

	useEffect(() => {
		void refreshDevices();
	}, [refreshDevices]);

	return {
		stream,
		isActive: Boolean(stream),
		devices,
		selectedDeviceId,
		error,
		start,
		stop,
		refreshDevices,
		setSelectedDeviceId,
		restart,
	};
};
