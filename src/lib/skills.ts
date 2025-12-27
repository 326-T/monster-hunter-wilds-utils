export const WEAPONS = [
	"大剣",
	"太刀",
	"片手剣",
	"双剣",
	"ハンマー",
	"狩猟笛",
	"ランス",
	"ガンランス",
	"スラアク",
	"チャアク",
	"操虫棍",
	"弓",
	"ライトボウガン",
	"ヘビィボウガン",
];

export const ATTRIBUTES = [
	"火属性",
	"水属性",
	"雷属性",
	"氷属性",
	"龍属性",
	"麻痺属性",
	"睡眠属性",
	"爆破属性",
	"毒属性",
];

export const UNKNOWN_SKILL_LABEL = "不明";
export const HIDDEN_SKILL_LABEL = "非表示スキル";

export type TableRef = {
	key: string;
	weapon: string;
	attribute: string;
	label: string;
};

export type TableEntry = {
	id: string;
	groupSkill: string;
	seriesSkill: string;
	favorite: boolean;
	createdAt: string;
	cursorId: number;
};

export type TableState = Record<string, TableEntry[]>;

export type CursorState = number;

export const STORAGE_KEY = "mhwu.tableEntries.v2";
export const CURSOR_KEY = "mhwu.attributeCursors.v2";

const WEAPON_EN_LABELS: Record<string, string> = {
	大剣: "Great Sword",
	太刀: "Long Sword",
	片手剣: "Sword & Shield",
	双剣: "Dual Blades",
	ハンマー: "Hammer",
	狩猟笛: "Hunting Horn",
	ランス: "Lance",
	ガンランス: "Gunlance",
	スラアク: "Switch Axe",
	チャアク: "Charge Blade",
	操虫棍: "Insect Glaive",
	弓: "Bow",
	ライトボウガン: "Light Bowgun",
	ヘビィボウガン: "Heavy Bowgun",
};

const ATTRIBUTE_EN_LABELS: Record<string, string> = {
	火属性: "Fire",
	水属性: "Water",
	雷属性: "Thunder",
	氷属性: "Ice",
	龍属性: "Dragon",
	麻痺属性: "Paralysis",
	睡眠属性: "Sleep",
	爆破属性: "Blast",
	毒属性: "Poison",
};

const SKILL_EN_LABELS: Record<string, string> = {
	[UNKNOWN_SKILL_LABEL]: "Unknown",
	[HIDDEN_SKILL_LABEL]: "Hidden Skill",
	鱗張りの技法: "Scale Plating Technique",
	革細工の柔性: "Leathercraft Flexibility",
	毛皮の昂揚: "Fur Exaltation",
	甲虫の知らせ: "Insect Tidings",
	護竜の脈動: "Guardian Dragon Pulse",
	ヌシの誇り: "Apex Pride",
	甲虫の擬態: "Insect Mimicry",
	革細工の滑性: "Leathercraft Smoothness",
	鱗重ねの工夫: "Layered Scale Craft",
	毛皮の誘惑: "Fur Temptation",
	護竜の守り: "Guardian Dragon Guard",
	ヌシの憤激: "Apex Fury",
	先達の導き: "Pioneer's Guidance",
	栄光の誉れ: "Glorious Honor",
	祝祭の巡り: "Festival Cycle",
	ヌシの魂: "Apex Soul",
	拳を極めし者: "Fist Master",
	闢獣の力: "Power of the Cleaving Beast",
	火竜の力: "Power of the Fire Wyvern",
	兇爪竜の力: "Power of the Savage Claw Wyvern",
	護鎖刃竜の命脈: "Lifeblood of the Guarded Chainblade Wyvern",
	波衣竜の守護: "Protection of the Wave-Wrought Wyvern",
	煌雷竜の力: "Power of the Shining Thunder Wyvern",
	雷顎竜の闘志: "Fighting Spirit of the Thunderjaw Wyvern",
	雪獅子の闘志: "Fighting Spirit of the Snow Lion",
	鎧竜の守護: "Protection of the Armored Wyvern",
	凍峰竜の反逆: "Rebellion of the Frostpeak Wyvern",
	暗器蛸の力: "Power of the Dagger Octopus",
	獄焔蛸の反逆: "Rebellion of the Hellflame Octopus",
	黒蝕竜の力: "Power of the Black Eclipse Dragon",
	鎖刃竜の飢餓: "Hunger of the Chainblade Wyvern",
	泡狐竜の力: "Power of the Bubble Fox Wyvern",
	白熾龍の脈動: "Pulse of the White Incandescent Dragon",
	花舞の祈り: "Prayer of the Flower Dance",
	千刃竜の闘志: "Fighting Spirit of the Thousand Blade Wyvern",
	海竜の渦雷: "Whirlpool Thunder of the Sea Wyvern",
	踊火の祈り: "Prayer of the Dancing Flame",
	暗黒騎士の証: "Proof of the Dark Knight",
	オメガレゾナンス: "Omega Resonance",
	夢灯の祈り: "Prayer of the Dreamlight",
	巨戟龍の黙示録: "Apocalypse of the Giant Halberd Dragon",
	祝謡の祈り: "Prayer of the Festive Hymn",
};

export const makeTableKey = (weapon: string, attribute: string) =>
	`${weapon}::${attribute}`;

export const allTables: TableRef[] = WEAPONS.flatMap((weapon) =>
	ATTRIBUTES.map((attribute) => ({
		weapon,
		attribute,
		key: makeTableKey(weapon, attribute),
		label: `${weapon} / ${attribute}`,
	})),
);

export const getWeaponLabel = (weapon: string, language: "ja" | "en") =>
	language === "en" ? (WEAPON_EN_LABELS[weapon] ?? weapon) : weapon;

export const getAttributeLabel = (attribute: string, language: "ja" | "en") =>
	language === "en" ? (ATTRIBUTE_EN_LABELS[attribute] ?? attribute) : attribute;

export const getSkillLabel = (skill: string, language: "ja" | "en") =>
	language === "en" ? (SKILL_EN_LABELS[skill] ?? skill) : skill;

export const getTableLabel = (
	table: Pick<TableRef, "weapon" | "attribute">,
	language: "ja" | "en",
	separator = " / ",
) =>
	`${getWeaponLabel(table.weapon, language)}${separator}${getAttributeLabel(table.attribute, language)}`;

export const getTableKeyLabel = (
	table: Pick<TableRef, "weapon" | "attribute">,
	language: "ja" | "en",
) =>
	`${getWeaponLabel(table.weapon, language)}::${getAttributeLabel(table.attribute, language)}`;

export const formatDate = (value: string, language: "ja" | "en" = "ja") => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString(language === "en" ? "en-US" : "ja-JP", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
};

export const createId = () => {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
