import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { ResponsiveSelect } from "../ui/responsive-select";
import { Select } from "../ui/select";
import { SectionCard } from "../ui/section-card";
import {
	allTables,
	ATTRIBUTES,
	getAttributeLabel,
	getSkillLabel,
	getTableKeyLabel,
	getTableLabel,
	getWeaponLabel,
	HIDDEN_SKILL_LABEL,
	makeTableKey,
	UNKNOWN_SKILL_LABEL,
	WEAPONS,
} from "../../lib/skills";
import type { TableEntry, TableRef, TableState } from "../../lib/skills";
import type { DesiredSkill } from "../../lib/desiredSkillDb";
import { useTranslation } from "react-i18next";
import Joyride, { STATUS, type CallBackProps, type Step } from "react-joyride";
import { useSkillOptions } from "../../hooks/useSkillOptions";

const tableMetaByKey = new Map(allTables.map((table) => [table.key, table]));
const BULK_WEAPON_ALL = "all";

type VerifyViewProps = {
	tables: TableState;
	cursor: number;
	onExport: () => unknown;
	onImport: (payload: unknown) => { ok: boolean; messageKey?: string };
	onToggleFavorite: (
		tableKey: string,
		entryId: string,
		favorite: boolean,
	) => void;
	desiredSkills: DesiredSkill[];
	onAddDesiredSkill: (input: {
		tableKey: string;
		seriesSkill?: string;
		groupSkill?: string;
	}) => void;
	onRemoveDesiredSkill: (id: string) => void;
	onToggleDesiredAcquired: (id: string, acquired: boolean) => void;
};

type BulkFavoriteDialogProps = {
	open: boolean;
	title: string;
	description: string;
	weaponLabel: string;
	seriesLabel: string;
	groupLabel: string;
	cancelLabel: string;
	applyLabel: string;
	allLabel: string;
	weaponOptions: string[];
	seriesOptions: string[];
	groupOptions: string[];
	weaponValue: string;
	seriesValue: string;
	groupValue: string;
	onWeaponChange: (value: string) => void;
	onSeriesChange: (value: string) => void;
	onGroupChange: (value: string) => void;
	onCancel: () => void;
	onApply: () => void;
	getWeaponLabel: (weapon: string, language: "ja" | "en") => string;
	getSkillLabel: (skill: string, language: "ja" | "en") => string;
	language: "ja" | "en";
};

function BulkFavoriteDialog({
	open,
	title,
	description,
	weaponLabel,
	seriesLabel,
	groupLabel,
	cancelLabel,
	applyLabel,
	allLabel,
	weaponOptions,
	seriesOptions,
	groupOptions,
	weaponValue,
	seriesValue,
	groupValue,
	onWeaponChange,
	onSeriesChange,
	onGroupChange,
	onCancel,
	onApply,
	getWeaponLabel,
	getSkillLabel,
	language,
}: BulkFavoriteDialogProps) {
	if (!open) return null;
	if (typeof document === "undefined") return null;
	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<dialog
				open
				className="grid w-full max-w-lg gap-4 rounded-2xl border border-border/60 bg-background p-4 shadow-xl"
				aria-label={title}
			>
				<div className="space-y-1">
					<div className="text-sm font-semibold">{title}</div>
					<div className="text-xs text-muted-foreground">{description}</div>
				</div>
				<div className="grid gap-3">
					<div className="grid gap-2">
						<Label className="text-xs">{weaponLabel}</Label>
						<Select
							value={weaponValue}
							onChange={(event) => onWeaponChange(event.target.value)}
							className="h-9 text-xs"
						>
							{weaponOptions.map((weapon) => (
								<option key={weapon} value={weapon}>
									{getWeaponLabel(weapon, language)}
								</option>
							))}
						</Select>
					</div>
					<div className="grid gap-2">
						<Label className="text-xs">{seriesLabel}</Label>
						<Select
							value={seriesValue}
							onChange={(event) => onSeriesChange(event.target.value)}
							className="h-9 text-xs"
						>
							<option value="all">{allLabel}</option>
							{seriesOptions.map((option) => (
								<option key={option} value={option}>
									{getSkillLabel(option, language)}
								</option>
							))}
						</Select>
					</div>
					<div className="grid gap-2">
						<Label className="text-xs">{groupLabel}</Label>
						<Select
							value={groupValue}
							onChange={(event) => onGroupChange(event.target.value)}
							className="h-9 text-xs"
						>
							<option value="all">{allLabel}</option>
							{groupOptions.map((option) => (
								<option key={option} value={option}>
									{getSkillLabel(option, language)}
								</option>
							))}
						</Select>
					</div>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					<Button variant="outline" size="sm" onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button size="sm" onClick={onApply}>
						{applyLabel}
					</Button>
				</div>
			</dialog>
		</div>,
		document.body,
	);
}

export function VerifyView({
	tables,
	cursor,
	onExport,
	onImport,
	onToggleFavorite,
	desiredSkills,
	onAddDesiredSkill,
	onRemoveDesiredSkill,
	onToggleDesiredAcquired,
}: VerifyViewProps) {
	const { t, i18n } = useTranslation();
	const language = i18n.language === "en" ? "en" : "ja";
	const [runTour, setRunTour] = useState(false);
	const [weaponFilter, setWeaponFilter] = useState("all");
	const [attributeFilter, setAttributeFilter] = useState("all");
	const [importMessageKey, setImportMessageKey] = useState("");
	const [bulkOpen, setBulkOpen] = useState(false);
	const [bulkWeapon, setBulkWeapon] = useState(BULK_WEAPON_ALL);
	const [bulkSeries, setBulkSeries] = useState("all");
	const [bulkGroup, setBulkGroup] = useState("all");
	const [desiredWeapon, setDesiredWeapon] = useState(WEAPONS[0] ?? "");
	const [desiredAttribute, setDesiredAttribute] = useState(ATTRIBUTES[0] ?? "");
	const [desiredAllAttributes, setDesiredAllAttributes] = useState(false);
	const [desiredSeriesSkill, setDesiredSeriesSkill] = useState("");
	const [desiredGroupSkill, setDesiredGroupSkill] = useState("");
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const { groupOptions, seriesOptions } = useSkillOptions();

	const filteredTables = useMemo(() => {
		const keys = Object.keys(tables).filter(
			(key) => (tables[key] ?? []).length > 0,
		);
		const metas = keys
			.map((key) => tableMetaByKey.get(key))
			.filter((table): table is TableRef => Boolean(table))
			.filter((table) => {
				if (weaponFilter !== "all" && table.weapon !== weaponFilter)
					return false;
				if (attributeFilter !== "all" && table.attribute !== attributeFilter)
					return false;
				return true;
			});
		return metas.sort((a, b) => {
			const aLabel = getTableLabel(a, language);
			const bLabel = getTableLabel(b, language);
			return aLabel.localeCompare(
				bLabel,
				language === "en" ? "en-US" : "ja-JP",
			);
		});
	}, [tables, weaponFilter, attributeFilter, language]);

	const entryMaps = useMemo(() => {
		const map = new Map<string, Map<number, TableEntry>>();
		for (const table of filteredTables) {
			const entries = tables[table.key] ?? [];
			const cursorMap = new Map<number, TableEntry>();
			for (const entry of entries) {
				cursorMap.set(entry.cursorId, entry);
			}
			map.set(table.key, cursorMap);
		}
		return map;
	}, [filteredTables, tables]);

	const cursorIds = useMemo(() => {
		const set = new Set<number>();
		for (const table of filteredTables) {
			const entries = tables[table.key] ?? [];
			for (const entry of entries) {
				set.add(entry.cursorId);
			}
		}
		return Array.from(set).sort((a, b) => a - b);
	}, [filteredTables, tables]);

	const advancedCursorIds = useMemo(() => {
		const set = new Set<number>();
		for (const entries of Object.values(tables)) {
			for (const entry of entries ?? []) {
				if (entry.advancedAt) {
					set.add(entry.cursorId);
				}
			}
		}
		return set;
	}, [tables]);

	const seriesFilterOptions = useMemo(() => {
		const list = [HIDDEN_SKILL_LABEL, UNKNOWN_SKILL_LABEL, ...seriesOptions];
		return Array.from(new Set(list));
	}, [seriesOptions]);

	const groupFilterOptions = useMemo(() => {
		const list = [HIDDEN_SKILL_LABEL, UNKNOWN_SKILL_LABEL, ...groupOptions];
		return Array.from(new Set(list));
	}, [groupOptions]);

	const sortedDesiredSkills = useMemo(() => {
		const locale = language === "en" ? "en-US" : "ja-JP";
		return [...desiredSkills].sort((a, b) => {
			const aTable = tableMetaByKey.get(a.tableKey);
			const bTable = tableMetaByKey.get(b.tableKey);
			const aWeapon = aTable
				? getWeaponLabel(aTable.weapon, language)
				: a.tableKey;
			const bWeapon = bTable
				? getWeaponLabel(bTable.weapon, language)
				: b.tableKey;
			if (aWeapon !== bWeapon) return aWeapon.localeCompare(bWeapon, locale);
			const aAttribute = aTable
				? getAttributeLabel(aTable.attribute, language)
				: "";
			const bAttribute = bTable
				? getAttributeLabel(bTable.attribute, language)
				: "";
			if (aAttribute !== bAttribute)
				return aAttribute.localeCompare(bAttribute, locale);
			const aSeries = a.seriesSkill
				? getSkillLabel(a.seriesSkill, language)
				: t("verify.desired.any");
			const bSeries = b.seriesSkill
				? getSkillLabel(b.seriesSkill, language)
				: t("verify.desired.any");
			if (aSeries !== bSeries) return aSeries.localeCompare(bSeries, locale);
			const aGroup = a.groupSkill
				? getSkillLabel(a.groupSkill, language)
				: t("verify.desired.any");
			const bGroup = b.groupSkill
				? getSkillLabel(b.groupSkill, language)
				: t("verify.desired.any");
			return aGroup.localeCompare(bGroup, locale);
		});
	}, [desiredSkills, language, t]);

	const tourSteps = useMemo<Step[]>(
		() => [
			{
				target: "[data-tour='verify-export']",
				content: t("tour.verify.export"),
			},
			{
				target: "[data-tour='verify-filters']",
				content: t("tour.verify.filters"),
			},
			{ target: "[data-tour='verify-table']", content: t("tour.verify.table") },
		],
		[t],
	);

	const handleTour = useCallback((data: CallBackProps) => {
		const finished =
			data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
		if (finished) setRunTour(false);
	}, []);

	const handleExport = () => {
		const data = onExport();
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		link.download = `mhwu-backup-${timestamp}.json`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	};

	const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const payload = JSON.parse(text);
			const result = onImport(payload);
			setImportMessageKey(
				result.ok
					? "verify.importSuccess"
					: (result.messageKey ?? "verify.importError"),
			);
		} catch {
			setImportMessageKey("verify.importError");
		} finally {
			event.target.value = "";
		}
	};

	const handleBulkFavorite = () => {
		const seriesFilter = bulkSeries === "all" ? "" : bulkSeries;
		const groupFilter = bulkGroup === "all" ? "" : bulkGroup;
		for (const [tableKey, entries] of Object.entries(tables)) {
			const tableMeta = tableMetaByKey.get(tableKey);
			if (!tableMeta) continue;
			if (bulkWeapon !== BULK_WEAPON_ALL && tableMeta.weapon !== bulkWeapon)
				continue;
			for (const entry of entries) {
				if (seriesFilter && entry.seriesSkill !== seriesFilter) continue;
				if (groupFilter && entry.groupSkill !== groupFilter) continue;
				if (entry.favorite) continue;
				onToggleFavorite(tableKey, entry.id, true);
			}
		}
		setBulkOpen(false);
	};

	const matchesDesiredSkill = useCallback(
		(entry: TableEntry, tableKey: string) =>
			desiredSkills.some((desired) => {
				if (desired.acquired) return false;
				if (desired.tableKey !== tableKey) return false;
				if (desired.seriesSkill && desired.seriesSkill !== entry.seriesSkill)
					return false;
				if (desired.groupSkill && desired.groupSkill !== entry.groupSkill)
					return false;
				return Boolean(desired.seriesSkill || desired.groupSkill);
			}),
		[desiredSkills],
	);

	const handleAutoFavoriteDesired = useCallback(() => {
		for (const [tableKey, entries] of Object.entries(tables)) {
			for (const entry of entries) {
				if (entry.favorite) continue;
				if (entry.cursorId < cursor) continue;
				if (!matchesDesiredSkill(entry, tableKey)) continue;
				onToggleFavorite(tableKey, entry.id, true);
			}
		}
	}, [tables, cursor, matchesDesiredSkill, onToggleFavorite]);

	const canAddDesiredSkill =
		Boolean(desiredWeapon && (desiredAllAttributes || desiredAttribute)) &&
		Boolean(desiredSeriesSkill || desiredGroupSkill);

	const handleAddDesiredSkill = () => {
		if (!canAddDesiredSkill) return;
		const attributes = desiredAllAttributes ? ATTRIBUTES : [desiredAttribute];
		for (const attribute of attributes) {
			onAddDesiredSkill({
				tableKey: makeTableKey(desiredWeapon, attribute),
				seriesSkill: desiredSeriesSkill || undefined,
				groupSkill: desiredGroupSkill || undefined,
			});
		}
	};

	return (
		<Card className="animate-fade-up">
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
			<CardContent className="space-y-6 pt-6">
				<SectionCard>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="space-y-1">
							<CardTitle className="heading-serif">
								{t("verify.title")}
							</CardTitle>
							<CardDescription>{t("verify.description")}</CardDescription>
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

				<SectionCard title={t("verify.sections.transfer")}>
					<div
						className="flex flex-wrap items-center justify-between gap-3"
						data-tour="verify-export"
					>
						<div className="flex flex-wrap gap-2">
							<Button variant="outline" size="sm" onClick={handleExport}>
								{t("verify.export")}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
							>
								{t("verify.import")}
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept="application/json"
								className="hidden"
								onChange={handleImport}
							/>
						</div>
						{importMessageKey && (
							<span className="text-xs text-muted-foreground">
								{t(importMessageKey)}
							</span>
						)}
					</div>
				</SectionCard>

				<SectionCard title={t("verify.sections.filters")}>
					<div className="grid gap-3 sm:grid-cols-2" data-tour="verify-filters">
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
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>{t("verify.cursors", { count: cursorIds.length })}</span>
						<span>{t("verify.columns", { count: filteredTables.length })}</span>
					</div>
				</SectionCard>

				<SectionCard title={t("verify.sections.desired")}>
					<div className="grid gap-4">
						<p className="text-xs text-muted-foreground">
							{t("verify.desired.description")}
						</p>
						<div className="grid gap-3 lg:grid-cols-4">
							<div className="space-y-2">
								<Label>{t("filter.weapon")}</Label>
								<Select
									value={desiredWeapon}
									onChange={(event) => setDesiredWeapon(event.target.value)}
									className="h-9 text-xs"
								>
									{WEAPONS.map((weapon) => (
										<option key={weapon} value={weapon}>
											{getWeaponLabel(weapon, language)}
										</option>
									))}
								</Select>
							</div>
							<div className="space-y-2">
								<Label>{t("filter.attribute")}</Label>
								<Select
									value={desiredAttribute}
									onChange={(event) => setDesiredAttribute(event.target.value)}
									className="h-9 text-xs"
									disabled={desiredAllAttributes}
								>
									{ATTRIBUTES.map((attribute) => (
										<option key={attribute} value={attribute}>
											{getAttributeLabel(attribute, language)}
										</option>
									))}
								</Select>
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Checkbox
										id="desired-all-attributes"
										checked={desiredAllAttributes}
										onChange={(event) =>
											setDesiredAllAttributes(event.target.checked)
										}
									/>
									<Label htmlFor="desired-all-attributes" className="text-xs">
										{t("verify.desired.allAttributes")}
									</Label>
								</div>
							</div>
							<div className="space-y-2">
								<Label>{t("verify.desired.series")}</Label>
								<Select
									value={desiredSeriesSkill}
									onChange={(event) =>
										setDesiredSeriesSkill(event.target.value)
									}
									className="h-9 text-xs"
								>
									<option value="">{t("verify.desired.any")}</option>
									{seriesOptions.map((option) => (
										<option key={option} value={option}>
											{getSkillLabel(option, language)}
										</option>
									))}
								</Select>
							</div>
							<div className="space-y-2">
								<Label>{t("verify.desired.group")}</Label>
								<Select
									value={desiredGroupSkill}
									onChange={(event) => setDesiredGroupSkill(event.target.value)}
									className="h-9 text-xs"
								>
									<option value="">{t("verify.desired.any")}</option>
									{groupOptions.map((option) => (
										<option key={option} value={option}>
											{getSkillLabel(option, language)}
										</option>
									))}
								</Select>
							</div>
						</div>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-xs text-muted-foreground">
								{t("verify.desired.note")}
							</span>
							<Button
								size="sm"
								onClick={handleAddDesiredSkill}
								disabled={!canAddDesiredSkill}
							>
								{t("verify.desired.add")}
							</Button>
						</div>
						<div className="overflow-x-auto rounded-2xl border border-border/60">
							<table className="w-max min-w-full border-collapse text-xs whitespace-nowrap">
								<thead className="bg-background text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
									<tr>
										<th className="px-3 py-2">{t("filter.weapon")}</th>
										<th className="px-3 py-2">{t("filter.attribute")}</th>
										<th className="px-3 py-2">{t("save.headers.series")}</th>
										<th className="px-3 py-2">{t("save.headers.group")}</th>
										<th className="px-3 py-2">{t("verify.desired.status")}</th>
										<th className="px-3 py-2">{t("verify.desired.actions")}</th>
									</tr>
								</thead>
								<tbody>
									{sortedDesiredSkills.length === 0 && (
										<tr>
											<td
												colSpan={6}
												className="px-4 py-6 text-center text-sm text-muted-foreground"
											>
												{t("verify.desired.empty")}
											</td>
										</tr>
									)}
									{sortedDesiredSkills.map((item) => {
										const tableMeta = tableMetaByKey.get(item.tableKey);
										const weaponLabel = tableMeta
											? getWeaponLabel(tableMeta.weapon, language)
											: item.tableKey;
										const attributeLabel = tableMeta
											? getAttributeLabel(tableMeta.attribute, language)
											: "-";
										const seriesLabel = item.seriesSkill
											? getSkillLabel(item.seriesSkill, language)
											: t("verify.desired.any");
										const groupLabel = item.groupSkill
											? getSkillLabel(item.groupSkill, language)
											: t("verify.desired.any");
										return (
											<tr key={item.id} className="border-t border-border/50">
												<td className="px-3 py-2">{weaponLabel}</td>
												<td className="px-3 py-2">{attributeLabel}</td>
												<td className="px-3 py-2">{seriesLabel}</td>
												<td className="px-3 py-2">{groupLabel}</td>
												<td className="px-3 py-2">
													<span
														className={`rounded-full px-2 py-1 text-[10px] ${
															item.acquired
																? "bg-emerald-50 text-emerald-700"
																: "bg-muted text-muted-foreground"
														}`}
													>
														{item.acquired
															? t("verify.desired.acquired")
															: t("verify.desired.pending")}
													</span>
												</td>
												<td className="px-3 py-2">
													<div className="flex flex-wrap items-center gap-2">
														<Button
															variant={item.acquired ? "default" : "outline"}
															size="sm"
															onClick={() =>
																onToggleDesiredAcquired(item.id, !item.acquired)
															}
														>
															{item.acquired
																? t("verify.desired.acquired")
																: t("verify.desired.pending")}
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => onRemoveDesiredSkill(item.id)}
														>
															{t("verify.desired.remove")}
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</SectionCard>

				<SectionCard title={t("verify.sections.table")}>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="space-y-1 text-xs text-muted-foreground">
							<div>{t("verify.bulk.note")}</div>
							<div>{t("verify.desired.autoFavoriteNote")}</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleAutoFavoriteDesired}
								disabled={desiredSkills.length === 0}
							>
								{t("verify.desired.autoFavorite")}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setBulkOpen(true)}
							>
								{t("verify.bulk.open")}
							</Button>
						</div>
					</div>
					<div
						className="overflow-x-auto rounded-2xl border border-border/60"
						data-tour="verify-table"
					>
						<table className="w-max min-w-full border-collapse text-xs whitespace-nowrap">
							<thead className="bg-background text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
								<tr>
									<th className="px-4 py-3">{t("verify.header.cursor")}</th>
									{filteredTables.map((table) => (
										<th key={table.key} className="px-3 py-2">
											<div className="text-[10px] text-muted-foreground">
												{getTableKeyLabel(table, language)}
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{cursorIds.length === 0 && (
									<tr>
										<td
											colSpan={Math.max(1, filteredTables.length + 1)}
											className="px-4 py-6 text-center text-sm text-muted-foreground"
										>
											{t("common.noEntries")}
										</td>
									</tr>
								)}
								{cursorIds.map((cursorId) => (
									<tr
										key={cursorId}
										className="border-t border-border/50 bg-background"
									>
										<td className="px-3 py-2">{cursorId + 1}</td>
										{filteredTables.map((table) => {
											const entry = entryMaps.get(table.key)?.get(cursorId);
											const isPassedUnselected =
												entry &&
												advancedCursorIds.has(entry.cursorId) &&
												!entry.advancedAt;
											return (
												<td key={table.key} className="px-3 py-2 align-top">
													{entry ? (
														<button
															type="button"
															onClick={() =>
																onToggleFavorite(
																	table.key,
																	entry.id,
																	!entry.favorite,
																)
															}
															className={`grid w-full gap-1 rounded-lg border p-2 text-left text-[10px] transition-colors ${
																isPassedUnselected
																	? "border-border/50 bg-muted/60 text-muted-foreground"
																	: entry.favorite
																		? "border-amber-200 bg-amber-50/70 text-amber-900"
																		: "border-border/40 bg-background hover:border-border/70 hover:bg-muted/40"
															}`}
															title={
																entry.favorite
																	? t("verify.favorite.remove")
																	: t("verify.favorite.add")
															}
														>
															<div className="text-[11px] text-muted-foreground">
																{t("save.headers.series")}
															</div>
															<div className="text-[11px] font-medium">
																{getSkillLabel(entry.seriesSkill, language)}
															</div>
															<div className="text-[11px] text-muted-foreground">
																{t("save.headers.group")}
															</div>
															<div className="text-[11px] font-medium">
																{getSkillLabel(entry.groupSkill, language)}
															</div>
														</button>
													) : (
														<span className="text-[10px] text-muted-foreground">
															-
														</span>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</SectionCard>
			</CardContent>
			<BulkFavoriteDialog
				open={bulkOpen}
				title={t("verify.bulk.title")}
				description={t("verify.bulk.description")}
				weaponLabel={t("verify.bulk.weapon")}
				seriesLabel={t("verify.bulk.series")}
				groupLabel={t("verify.bulk.group")}
				cancelLabel={t("verify.bulk.cancel")}
				applyLabel={t("verify.bulk.apply")}
				allLabel={t("common.all")}
				weaponOptions={[BULK_WEAPON_ALL, ...WEAPONS]}
				seriesOptions={seriesFilterOptions}
				groupOptions={groupFilterOptions}
				weaponValue={bulkWeapon}
				seriesValue={bulkSeries}
				groupValue={bulkGroup}
				onWeaponChange={setBulkWeapon}
				onSeriesChange={setBulkSeries}
				onGroupChange={setBulkGroup}
				onCancel={() => setBulkOpen(false)}
				onApply={handleBulkFavorite}
				getWeaponLabel={(weapon, lang) =>
					weapon === BULK_WEAPON_ALL
						? t("common.all")
						: getWeaponLabel(weapon, lang)
				}
				getSkillLabel={getSkillLabel}
				language={language}
			/>
		</Card>
	);
}
