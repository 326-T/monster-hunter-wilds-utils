import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { clearDataset, exportDataset, getDataset } from "./lib/ocrDataset";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

if (import.meta.env.DEV && typeof window !== "undefined") {
	const target = window as typeof window & {
		mhwuGetOcrDataset?: () => ReturnType<typeof getDataset>;
		mhwuExportOcrDataset?: () => void;
		mhwuClearOcrDataset?: () => void;
	};
	target.mhwuGetOcrDataset = () => getDataset();
	target.mhwuExportOcrDataset = () => exportDataset();
	target.mhwuClearOcrDataset = () => clearDataset();
}
