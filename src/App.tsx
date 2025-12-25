import { useEffect, useState } from "react";
import { CursorView } from "./components/cursor/CursorView";
import { SaveView } from "./components/save/SaveView";
import { Button } from "./components/ui/button";
import { VerifyView } from "./components/verify/VerifyView";
import { useSkillOptions } from "./hooks/useSkillOptions";
import { useTableState } from "./hooks/useTableState";

function App() {
	const [activeView, setActiveView] = useState<"save" | "cursor" | "verify">(
		"save",
	);
	const [showHeaderTitle, setShowHeaderTitle] = useState(true);
	const { groupOptions, seriesOptions, isLoading, error } = useSkillOptions();
	const {
		tables,
		cursorByAttribute,
		addEntry,
		toggleFavorite,
		advanceCursor,
		exportData,
		importData,
	} = useTableState();

	useEffect(() => {
		const handleScroll = () => {
			setShowHeaderTitle(window.scrollY < 24);
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="min-h-screen">
			<header className="fixed inset-x-0 top-0 z-40 bg-background">
				<div className="mx-auto max-w-6xl px-6 py-4">
					<div className="flex flex-col items-center gap-3">
						<div
							className={`overflow-hidden text-center transition-all duration-300 ${
								showHeaderTitle ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
							}`}
							aria-hidden={!showHeaderTitle}
						>
							<h1 className="text-lg font-semibold heading-serif sm:text-xl">
								巨戟アーティア スキル抽選メモ
							</h1>
						</div>
						<div className="flex justify-center">
							<div className="inline-flex items-center overflow-hidden rounded-full border border-border bg-background shadow-sm">
								<Button
									variant={activeView === "save" ? "default" : "ghost"}
									onClick={() => setActiveView("save")}
									className="w-28 rounded-none px-5 first:rounded-l-full last:rounded-r-full"
									size="sm"
								>
									記録する
								</Button>
								<Button
									variant={activeView === "verify" ? "default" : "ghost"}
									onClick={() => setActiveView("verify")}
									className="w-28 rounded-none px-5 first:rounded-l-full last:rounded-r-full"
									size="sm"
								>
									確認する
								</Button>
								<Button
									variant={activeView === "cursor" ? "default" : "ghost"}
									onClick={() => setActiveView("cursor")}
									className="w-28 rounded-none px-5 first:rounded-l-full last:rounded-r-full"
									size="sm"
								>
									進める
								</Button>
							</div>
						</div>
					</div>
				</div>
			</header>
			<div className="relative pt-20">
				<div className="pointer-events-none absolute -top-32 right-10 h-72 w-72 rounded-full blur-3xl animate-float" />
				<div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-80 w-80 rounded-full blur-3xl" />
				<div className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
					{activeView === "save" && (
						<SaveView
							tables={tables}
							cursorByAttribute={cursorByAttribute}
							groupOptions={groupOptions}
							seriesOptions={seriesOptions}
							isLoadingOptions={isLoading}
							optionsError={error}
							onAddEntry={addEntry}
							onToggleFavorite={toggleFavorite}
						/>
					)}
					{activeView === "cursor" && (
						<CursorView
							tables={tables}
							cursorByAttribute={cursorByAttribute}
							onAdvanceCursor={advanceCursor}
						/>
					)}
					{activeView === "verify" && (
						<VerifyView tables={tables} onExport={exportData} onImport={importData} />
					)}
				</div>
			</div>
		</div>
	);
}

export default App;
