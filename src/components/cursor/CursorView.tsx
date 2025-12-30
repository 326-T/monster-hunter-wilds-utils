import { useCallback, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { ResponsiveSelect } from "../ui/responsive-select";
import { SectionCard } from "../ui/section-card";
import {
	allTables,
	ATTRIBUTES,
	formatDate,
	getAttributeLabel,
	getSkillLabel,
	getTableLabel,
	getWeaponLabel,
	UNKNOWN_SKILL_LABEL,
	WEAPONS,
} from "../../lib/skills";
import type {
	CursorState,
	TableEntry,
	TableRef,
	TableState,
} from "../../lib/skills";
import { useTranslation } from "react-i18next";
import Joyride, { STATUS, type CallBackProps, type Step } from "react-joyride";

type CursorViewProps = {
	tables: TableState;
	cursor: CursorState;
	onAdvanceCursor: (selection: { tableKey: string; entryId: string }) => void;
};

export function CursorView({
	tables,
	cursor,
	onAdvanceCursor,
}: CursorViewProps) {
	const { t, i18n } = useTranslation();
	const language = i18n.language === "en" ? "en" : "ja";
	const [runTour, setRunTour] = useState(false);
	const [weaponFilter, setWeaponFilter] = useState("all");
	const [attributeFilter, setAttributeFilter] = useState("all");

	const filteredAttributeTables = useMemo(() => {
		return allTables.filter((table) => {
			if (weaponFilter !== "all" && table.weapon !== weaponFilter) return false;
			if (attributeFilter !== "all" && table.attribute !== attributeFilter)
				return false;
			return true;
		});
	}, [weaponFilter, attributeFilter]);
	const activeCursor = cursor;

	const cursorCandidates = useMemo(() => {
		const candidates = filteredAttributeTables
			.map((table) => {
				const entry = (tables[table.key] ?? []).find(
					(item) => item.cursorId === activeCursor,
				);
				if (!entry) return null;
				return { table, entry };
			})
			.filter((value): value is { table: TableRef; entry: TableEntry } =>
				Boolean(value),
			);

		return candidates.sort((a, b) => {
			if (a.entry.favorite !== b.entry.favorite) {
				return a.entry.favorite ? -1 : 1;
			}
			const aLabel = getTableLabel(a.table, language);
			const bLabel = getTableLabel(b.table, language);
			return aLabel.localeCompare(
				bLabel,
				language === "en" ? "en-US" : "ja-JP",
			);
		});
	}, [filteredAttributeTables, tables, activeCursor, language]);

	const nullCount = filteredAttributeTables.length - cursorCandidates.length;

	const tourSteps = useMemo<Step[]>(
		() => [
			{
				target: "[data-tour='cursor-filters']",
				content: t("tour.cursor.filters"),
			},
			{
				target: "[data-tour='cursor-candidates']",
				content: t("tour.cursor.candidates"),
			},
			{
				target: "[data-tour='cursor-candidates']",
				content: t("tour.cursor.advance"),
				disableBeacon: true,
			},
		],
		[t],
	);

	const handleTour = useCallback((data: CallBackProps) => {
		const finished =
			data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
		if (finished) setRunTour(false);
	}, []);

	return (
		<div className="flex flex-col gap-8">
			<Joyride
				steps={tourSteps}
				run={runTour}
				continuous
				showSkipButton
				showProgress
				disableOverlayClose
				scrollOffset={160}
				callback={handleTour}
				locale={{
					back: t("tour.back"),
					close: t("tour.close"),
					last: t("tour.last"),
					next: t("tour.next"),
					skip: t("tour.skip"),
				}}
			/>
			<Card className="animate-fade-up">
				<CardContent className="space-y-8 pt-6">
					<SectionCard>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="space-y-1">
								<CardTitle className="heading-serif">
									{t("cursor.title")}
								</CardTitle>
								<CardDescription>
									{t("cursor.description", { value: activeCursor })}
								</CardDescription>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setRunTour(true)}
							>
								{t("tour.start")}
							</Button>
						</div>
					</SectionCard>

					<SectionCard title={t("cursor.sections.filters")}>
						<div
							className="grid gap-3 sm:grid-cols-2"
							data-tour="cursor-filters"
						>
							<div className="space-y-2">
								<Label>{t("filter.weapon")}</Label>
								<ResponsiveSelect
									name="filter-weapon"
									value={weaponFilter}
									onChange={setWeaponFilter}
									options={[
										{ value: "all", label: t("common.all") },
										...WEAPONS.map((weapon) => ({
											value: weapon,
											label: getWeaponLabel(weapon, language),
										})),
									]}
									gridClassName="sm:grid-cols-3 lg:grid-cols-4"
								/>
							</div>
							<div className="space-y-2 sm:col-span-2 lg:col-span-1">
								<Label>{t("filter.attribute")}</Label>
								<ResponsiveSelect
									name="filter-attribute"
									value={attributeFilter}
									onChange={setAttributeFilter}
									options={[
										{ value: "all", label: t("common.all") },
										...ATTRIBUTES.map((attribute) => ({
											value: attribute,
											label: getAttributeLabel(attribute, language),
										})),
									]}
									gridClassName="sm:grid-cols-3 lg:grid-cols-4"
								/>
							</div>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
							<span>
								{t("cursor.candidates", { count: cursorCandidates.length })}
							</span>
							<span>{t("cursor.nullCount", { count: nullCount })}</span>
						</div>
					</SectionCard>

					<SectionCard title={t("cursor.sections.candidates")}>
						<div
							className="grid gap-4 md:grid-cols-2"
							data-tour="cursor-candidates"
						>
							{cursorCandidates.length === 0 && (
								<div className="rounded-xl border border-dashed border-border/60 bg-background p-6 text-center text-sm text-muted-foreground">
									{t("cursor.noCandidates")}
								</div>
							)}
							{cursorCandidates.map(({ table, entry }) => (
								<div
									key={table.key}
									className="rounded-2xl border border-border/50 bg-background p-4"
								>
									<div className="grid gap-4">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<div className="text-sm font-semibold">
													{getWeaponLabel(table.weapon, language)}
												</div>
												<div className="text-xs text-muted-foreground">
													{getAttributeLabel(table.attribute, language)}
												</div>
											</div>
											{entry.favorite && <Badge>{t("common.favorite")}</Badge>}
										</div>
										<div className="grid gap-2 text-sm">
											<div>
												<span className="text-xs text-muted-foreground">
													{t("save.headers.series")}
												</span>
												<div className="font-medium">
													{getSkillLabel(entry.seriesSkill, language)}
												</div>
											</div>
											<div>
												<span className="text-xs text-muted-foreground">
													{t("save.headers.group")}
												</span>
												<div className="font-medium">
													{getSkillLabel(entry.groupSkill, language)}
												</div>
											</div>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-xs text-muted-foreground">
												{t("cursor.addedAt", {
													value: formatDate(entry.createdAt, language),
												})}
											</span>
											<Button
												size="sm"
												onClick={() =>
													onAdvanceCursor({
														tableKey: table.key,
														entryId: entry.id,
													})
												}
											>
												{t("cursor.advanceButton")}
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>

						<div className="rounded-xl border border-border/50 bg-background p-4 text-xs text-muted-foreground">
							{t("cursor.advanceNote", {
								label: getSkillLabel(UNKNOWN_SKILL_LABEL, language),
							})}
						</div>
					</SectionCard>
				</CardContent>
			</Card>
		</div>
	);
}
