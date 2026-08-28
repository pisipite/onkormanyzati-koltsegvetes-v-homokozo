<script setup lang="ts">
import {
	AlertCircle,
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	ChevronsUp,
	CircleHelp,
	Eye,
	EyeOff,
	Pencil,
	Plus,
	Trash2,
} from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { cn } from '~/lib/utils';
import {
	applyEconomicRowChanges,
	buildTrackerNodes,
	createSubtreeCodeChanges,
	economicDescriptor,
	findCodeCollision,
	findMissingRowInsertion,
	findSiblingContext,
	findTrackerNode,
	hasAvailableParent,
	hasSameCodeShape,
	readEconomicRows,
	shiftSiblingCode,
} from '~/utils/budget-item-tracker';
import type { EconomicRowChange, TrackerNode } from '~/utils/budget-item-tracker';

type YearTree = {
	children: TrackerNode[];
	sheetName: string;
};

type TrackerSide = 'expense' | 'income';

type ComparisonRow = {
	code: string;
	depth: number;
	hasChildren: boolean;
	hasMixedTimelineCodes: boolean;
	nodes: Record<string, TrackerNode | undefined>;
	path: string;
	status: 'different' | 'same' | 'single';
};

const props = withDefaults(
	defineProps<{
		side?: TrackerSide;
	}>(),
	{
		side: 'expense',
	},
);

const sheetKey = computed(() => (props.side === 'income' ? 'incomeSheet' : 'expenseSheet'));
const sideLabel = computed(() => (props.side === 'income' ? 'bevételek' : 'kiadások'));
const sideAdjective = computed(() => (props.side === 'income' ? 'bevételi' : 'kiadási'));
const economicViewLabel = computed(() => `Közgazdasági ${sideLabel.value}`);

const { workbook, years } = await useBudgetData();
const { markStructureModified } = useModifications();
const {
	ids: timelineCodeIds,
	isLimitEnabled: isTimelineCodeLimitEnabled,
	setEnabled: setTimelineCodeEnabled,
} = await useTimelineCodeTracking();

const treeRevision = ref(0);
const expandedPaths = ref(new Set<string>());
const selectedYears = ref<string[]>([]);

const availableYears = computed(() =>
	Object.entries(years.value || {})
		.filter(([, sheets]) => Boolean(sheets[sheetKey.value]))
		.map(([year]) => year)
		.sort((a, b) => a.localeCompare(b)),
);
const { getEntry: getTooltipEntry } = await useBudgetTooltips(availableYears);

watch(
	availableYears,
	(values, previousValues = []) => {
		selectedYears.value = values.filter(
			(year) => selectedYears.value.includes(year) || !previousValues.includes(year),
		);
	},
	{ immediate: true },
);

const activeYears = computed(() =>
	availableYears.value.filter((year) => selectedYears.value.includes(year)),
);

function buildYearTree(year: string): YearTree | undefined {
	const sheetName = years.value?.[year]?.[sheetKey.value];
	const sheet = sheetName && workbook.value?.getWorksheet(sheetName);
	if (!sheetName || !sheet) return undefined;
	return {
		children: buildTrackerNodes(readEconomicRows(sheet)),
		sheetName,
	};
}

function trackTreeRevision() {
	return treeRevision.value;
}

const allYearTrees = computed(() => {
	trackTreeRevision();
	const trees: Record<string, YearTree> = {};
	for (const year of availableYears.value) {
		const tree = buildYearTree(year);
		if (tree) trees[year] = tree;
	}
	return trees;
});

const yearTrees = computed(() => {
	const trees: Record<string, YearTree> = {};
	for (const year of activeYears.value) {
		const tree = allYearTrees.value[year];
		if (tree) trees[year] = tree;
	}
	return trees;
});

function normalizedName(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

function comparisonStatus(nodes: Record<string, TrackerNode | undefined>) {
	if (activeYears.value.length < 2) return 'single' as const;
	const presentNodes = activeYears.value.map((year) => nodes[year]);
	if (presentNodes.some((node) => !node)) return 'different' as const;
	const names = presentNodes.map((node) => normalizedName(node?.name || ''));
	return names.every((name) => name === names[0]) ? ('same' as const) : ('different' as const);
}

function mergedRows() {
	const rows: ComparisonRow[] = [];

	function appendLevel(
		childrenByYear: Record<string, TrackerNode[]>,
		parentPath: string,
		depth: number,
	) {
		const slots = new Map<string, Record<string, TrackerNode | undefined>>();
		for (const year of activeYears.value) {
			const occurrences = new Map<string, number>();
			for (const node of childrenByYear[year] || []) {
				const occurrence = (occurrences.get(node.code) || 0) + 1;
				occurrences.set(node.code, occurrence);
				const slotKey = `${node.code}#${occurrence}`;
				if (!slots.has(slotKey)) slots.set(slotKey, {});
				slots.get(slotKey)![year] = node;
			}
		}

		const sortedSlots = Array.from(slots.entries()).sort(([first], [second]) =>
			first.localeCompare(second, 'hu', { numeric: true }),
		);
		const levelCodes = new Set(
			sortedSlots
				.map(([, nodes]) => Object.values(nodes).find((node) => node)?.code)
				.filter((code): code is string => Boolean(code)),
		);
		const hasMixedTimelineCodes =
			depth > 0 &&
			Array.from(levelCodes).some((code) => timelineCodeIds.value.has(code)) &&
			Array.from(levelCodes).some((code) => !timelineCodeIds.value.has(code));

		for (const [slotKey, nodes] of sortedSlots) {
			const path = `${parentPath}/${slotKey}`;
			const hasChildren = Object.values(nodes).some((node) => node?.children.length);
			const code = Object.values(nodes).find((node) => node)?.code || '';
			rows.push({
				code,
				depth,
				hasChildren,
				hasMixedTimelineCodes,
				nodes,
				path,
				status: comparisonStatus(nodes),
			});
			if (!hasChildren || !expandedPaths.value.has(path)) continue;
			const nextChildren: Record<string, TrackerNode[]> = {};
			for (const year of activeYears.value) {
				nextChildren[year] = nodes[year]?.children || [];
			}
			appendLevel(nextChildren, path, depth + 1);
		}
	}

	const roots: Record<string, TrackerNode[]> = {};
	for (const year of activeYears.value) roots[year] = yearTrees.value[year]?.children || [];
	appendLevel(roots, 'root', 0);
	return rows;
}

const comparisonRows = computed(mergedRows);
const amountFormatter = new Intl.NumberFormat('hu-HU', {
	maximumFractionDigits: 2,
});
const gridStyle = computed(() => {
	const yearCount = Math.max(activeYears.value.length, 1);
	if (yearCount <= 2) {
		return {
			gridTemplateColumns: `minmax(5.5rem, 7rem) repeat(${yearCount}, minmax(0, 1fr))`,
			minWidth: '100%',
			width: '100%',
		};
	}
	return {
		gridTemplateColumns: `7rem repeat(${yearCount}, minmax(18rem, 1fr))`,
		minWidth: `${7 + yearCount * 18}rem`,
	};
});
const topScroll = useTemplateRef<HTMLElement>('topScroll');
const tableScroll = useTemplateRef<HTMLElement>('tableScroll');
let syncingHorizontalScroll = false;

function syncHorizontalScroll(source: HTMLElement | null, target: HTMLElement | null) {
	if (!source || !target || syncingHorizontalScroll) return;
	syncingHorizontalScroll = true;
	target.scrollLeft = source.scrollLeft;
	requestAnimationFrame(() => {
		syncingHorizontalScroll = false;
	});
}

function toggleYear(year: string) {
	selectedYears.value = selectedYears.value.includes(year)
		? selectedYears.value.filter((value) => value !== year)
		: [...selectedYears.value, year];
}

function togglePath(path: string) {
	const next = new Set(expandedPaths.value);
	if (next.has(path)) next.delete(path);
	else next.add(path);
	expandedPaths.value = next;
}

function collapseAll() {
	expandedPaths.value = new Set();
}

function toggleTimelineCode(code: string) {
	setTimelineCodeEnabled(code, !timelineCodeIds.value.has(code));
}

function hasTooltip(year: string, code: string) {
	return Boolean(getTooltipEntry(year, code)?.text.trim());
}

function hasTooltipInOtherYear(year: string, code: string) {
	return (
		!hasTooltip(year, code) &&
		availableYears.value.some((otherYear) => otherYear !== year && hasTooltip(otherYear, code))
	);
}

function tooltipButtonHint(year: string, code: string) {
	if (hasTooltip(year, code)) return 'Súgószöveg szerkesztése';
	if (hasTooltipInOtherYear(year, code)) {
		return 'Ebben az évben nincs súgószöveg, másik évben van';
	}
	return 'Súgószöveg hozzáadása';
}

const tooltipEditorOpen = ref(false);
const tooltipYear = ref('');
const tooltipNode = ref<TrackerNode>();
const tooltipNamesByYear = computed(() => {
	const names: Record<string, string> = {};
	if (!tooltipNode.value) return names;
	for (const year of availableYears.value) {
		const node = findTrackerNode(allYearTrees.value[year]?.children || [], tooltipNode.value.code);
		if (node) names[year] = node.name;
	}
	return names;
});

function openTooltipEditor(year: string, node: TrackerNode) {
	tooltipYear.value = year;
	tooltipNode.value = node;
	tooltipEditorOpen.value = true;
}

function formatAmount(value: unknown) {
	const amount = Number(value || 0);
	return Number.isFinite(amount) ? amountFormatter.format(amount) : '0';
}

function parseAmountInput(value: string) {
	const normalized = value.replace(/\s+/g, '').replace(',', '.');
	if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
	const amount = Number(normalized);
	return Number.isFinite(amount) ? amount : undefined;
}

function childAmountTotal(node: TrackerNode) {
	return node.children.reduce(
		(total, child) => total + (Number.isFinite(child.value) ? child.value : 0),
		0,
	);
}

function hasAmountMismatch(node: TrackerNode) {
	return node.children.length > 0 && Math.abs(node.value - childAmountTotal(node)) > 0.005;
}

function amountMismatchDescription(node: TrackerNode) {
	const childTotal = childAmountTotal(node);
	return `A főkategória összege ${formatAmount(node.value)} Ft, az alkategóriák összege ${formatAmount(childTotal)} Ft. Eltérés: ${formatAmount(node.value - childTotal)} Ft.`;
}

const editorOpen = ref(false);
const editYear = ref('');
const editNode = ref<TrackerNode>();
const editCode = ref('');
const editName = ref('');
const editAmount = ref('');

function openEditor(year: string, node: TrackerNode) {
	if (!node.rowNumber) {
		toast.error('A tételhez tartozó Excel-sor nem található.');
		return;
	}
	editYear.value = year;
	editNode.value = node;
	editCode.value = node.code;
	editName.value = node.name;
	editAmount.value = String(node.value);
	editorOpen.value = true;
}

function toggleChartVisibility(year: string, node: TrackerNode) {
	const tree = yearTrees.value[year];
	const sheet = tree && workbook.value?.getWorksheet(tree.sheetName);
	if (!tree || !sheet || !node.rowNumber) {
		toast.error('A tételhez tartozó Excel-sor nem található.');
		return;
	}

	const isVisible = !node.isChartVisible;
	sheet.getRow(node.rowNumber).getCell(1).value = isVisible ? 99 : null;
	markStructureModified(tree.sheetName);
	treeRevision.value++;
	toast.success(
		`${year} ${node.code}: az összeg ${isVisible ? 'megjelenik' : 'nem jelenik meg'} az ábrákon.`,
	);
}

function isPlaceholder(node: TrackerNode) {
	return !normalizedName(node.name) && node.children.length === 0;
}

function planSiblingShift(siblings: TrackerNode[], startIndex: number, offset: -1 | 1) {
	const changes: EconomicRowChange[] = [];
	for (const sibling of siblings.slice(startIndex)) {
		const nextSiblingCode = shiftSiblingCode(sibling, offset);
		if (!nextSiblingCode) {
			return `A ${sibling.code} kód ezen a hierarchiaszinten nem számozható tovább.`;
		}
		const subtreeChanges = createSubtreeCodeChanges(sibling, nextSiblingCode);
		if (!subtreeChanges) {
			return 'Az alágban szabálytalan kódkapcsolat található, ezért nem számozható át.';
		}
		changes.push(...subtreeChanges);
	}
	return changes;
}

function deletePlaceholder(year: string, node: TrackerNode) {
	if (!isPlaceholder(node)) return;
	const tree = yearTrees.value[year];
	const sheet = tree && workbook.value?.getWorksheet(tree.sheetName);
	if (!tree || !sheet || !node.rowNumber) {
		toast.error('A placeholderhez tartozó Excel-sor nem található.');
		return;
	}

	const context = findSiblingContext(tree.children, node.rowNumber);
	if (!context) {
		toast.error('A placeholder helye nem azonosítható a hierarchiában.');
		return;
	}
	const shiftPlan = planSiblingShift(context.siblings, context.index + 1, -1);
	if (typeof shiftPlan === 'string') {
		toast.error(shiftPlan);
		return;
	}
	const remainingRows = readEconomicRows(sheet).filter((row) => row.rowNumber !== node.rowNumber);
	const collision = findCodeCollision(remainingRows, shiftPlan);
	if (collision) {
		toast.error(`A törlés nem végezhető el, mert a ${collision} kód már foglalt.`);
		return;
	}
	if (!confirm(`Biztosan törlöd a(z) ${year} évi ${node.code} placeholder sort?`)) return;

	applyEconomicRowChanges(sheet, shiftPlan);
	sheet.spliceRows(node.rowNumber, 1);
	markStructureModified(tree.sheetName);
	treeRevision.value++;
	toast.success(`${year}: a ${node.code} placeholder törölve, a következő kódok visszaszámozva.`);
}

function applyEdit() {
	const year = editYear.value;
	const node = editNode.value;
	const tree = yearTrees.value[year];
	const sheetName = tree?.sheetName;
	const sheet = sheetName && workbook.value?.getWorksheet(sheetName);
	if (!node || !tree || !sheetName || !sheet) return;

	const newCode = editCode.value.trim().toUpperCase();
	const newName = normalizedName(editName.value);
	const newAmount = parseAmountInput(editAmount.value);
	const validCode =
		props.side === 'income' ? /^(?:B|FT)\d+$/.test(newCode) : /^(?:K|FH|FT)\d+$/.test(newCode);
	if (!validCode) {
		toast.error(
			props.side === 'income'
				? 'A bevételi kód B vagy FT előtaggal és számjegyekkel adható meg.'
				: 'A kiadási kód K, FH vagy FT előtaggal és számjegyekkel adható meg.',
		);
		return;
	}
	if (!newName) {
		toast.error('A tétel neve nem lehet üres.');
		return;
	}
	if (newAmount === undefined) {
		toast.error('Az összeg csak érvényes szám lehet.');
		return;
	}
	if (
		newCode === node.code &&
		newName === normalizedName(node.name) &&
		newAmount === node.value
	) {
		editorOpen.value = false;
		return;
	}
	if (newCode !== node.code && !hasSameCodeShape(node.code, newCode)) {
		toast.error('A kód előtagja és hierarchiaszintje nem változtatható meg.');
		return;
	}
	if (newCode !== node.code && !hasAvailableParent(tree.children, node, newCode)) {
		toast.error('Az új kódhoz tartozó szülőtétel nem található ebben az évben.');
		return;
	}

	let changes: EconomicRowChange[] = [
		{ code: node.code, name: newName, nextCode: newCode, rowNumber: node.rowNumber },
	];
	if (newCode !== node.code) {
		const subtreeChanges = createSubtreeCodeChanges(node, newCode);
		if (!subtreeChanges) {
			toast.error(
				'Az alágban szabálytalan kódkapcsolat található, ezért nem írható át biztonságosan.',
			);
			return;
		}
		changes = subtreeChanges.map((change) =>
			change.rowNumber === node.rowNumber ? { ...change, name: newName } : change,
		);
		const allowedCollisions = node.name.startsWith('ebből:')
			? new Set([node.rowNumber])
			: undefined;
		const collision = findCodeCollision(readEconomicRows(sheet), changes, allowedCollisions);
		if (collision) {
			toast.error(`A ${collision} kód már szerepel a(z) ${year} évi ${sideLabel.value} között.`);
			return;
		}
		if (
			!confirm('A kód módosítása a tétel teljes alágának kódját átírja. Biztosan folytatod?')
		) {
			return;
		}
	}

	applyEconomicRowChanges(sheet, changes);
	sheet.getRow(node.rowNumber).getCell(3).value = newAmount;
	markStructureModified(sheetName);
	treeRevision.value++;
	editorOpen.value = false;
	toast.success(`${year}: a tétel módosítása bekerült a nem mentett változások közé.`);
}

const insertOpen = ref(false);
const insertMode = ref<'before' | 'missing'>('before');
const insertYear = ref('');
const insertNode = ref<TrackerNode>();
const insertReferenceNode = ref<TrackerNode>();
const insertCode = ref('');
const insertName = ref('');
const insertAmount = ref('0');

function openInsert(year: string, node: TrackerNode) {
	if (!node.rowNumber) {
		toast.error('A tételhez tartozó Excel-sor nem található.');
		return;
	}
	insertYear.value = year;
	insertNode.value = node;
	insertReferenceNode.value = undefined;
	insertCode.value = node.code;
	insertName.value = '';
	insertAmount.value = '0';
	insertMode.value = 'before';
	insertOpen.value = true;
}

function openMissingInsert(year: string, row: ComparisonRow) {
	const reference = Object.values(row.nodes).find((node) => node);
	if (!reference) return;
	insertYear.value = year;
	insertNode.value = undefined;
	insertReferenceNode.value = reference;
	insertCode.value = reference.code;
	insertName.value = reference.name;
	insertAmount.value = '0';
	insertMode.value = 'missing';
	insertOpen.value = true;
}

function applyInsert() {
	const year = insertYear.value;
	const tree = yearTrees.value[year];
	const sheet = tree && workbook.value?.getWorksheet(tree.sheetName);
	if (!tree || !sheet) return;
	const name = normalizedName(insertName.value);
	const amount = parseAmountInput(insertAmount.value);
	if (amount === undefined) {
		toast.error('Az összeg csak érvényes szám lehet.');
		return;
	}

	if (insertMode.value === 'missing') {
		const reference = insertReferenceNode.value;
		if (!reference) return;
		const position = findMissingRowInsertion(tree.children, reference);
		if ('missingParentCode' in position) {
			toast.error(
				`Előbb a ${position.missingParentCode} szülőtételt kell hozzáadni a(z) ${year} évhez.`,
			);
			return;
		}
		const hasSameCode = readEconomicRows(sheet).some((row) => row.code === reference.code);
		if (hasSameCode && !name.startsWith('ebből:')) {
			toast.error(
				`A ${reference.code} kód már szerepel a(z) ${year} évi ${sideLabel.value} között.`,
			);
			return;
		}
		sheet.insertRows(position.rowNumber, [
			[99, economicDescriptor(name, reference.code), amount],
		]);
		markStructureModified(tree.sheetName);
		treeRevision.value++;
		insertOpen.value = false;
		toast.success(
			`${year}: az új ${reference.code} tétel bekerült a nem mentett változások közé.`,
		);
		return;
	}

	const target = insertNode.value;
	if (!target) return;

	const context = findSiblingContext(tree.children, target.rowNumber);
	if (!context) {
		toast.error('A tétel helye nem azonosítható a hierarchiában.');
		return;
	}

	const shiftPlan = planSiblingShift(context.siblings, context.index, 1);
	if (typeof shiftPlan === 'string') {
		toast.error(shiftPlan);
		return;
	}

	const collision = findCodeCollision(readEconomicRows(sheet), shiftPlan);
	if (collision) {
		toast.error(`A beszúrás nem végezhető el, mert a ${collision} kód már foglalt.`);
		return;
	}

	applyEconomicRowChanges(sheet, shiftPlan);
	sheet.insertRows(target.rowNumber, [[99, economicDescriptor(name, target.code), amount]]);
	markStructureModified(tree.sheetName);
	treeRevision.value++;
	insertOpen.value = false;
	toast.success(`${year}: az új ${target.code} sor bekerült a nem mentett változások közé.`);
}
</script>

<template>
	<section
		:aria-label="economicViewLabel"
		class="flex min-w-0 max-w-full flex-col gap-4"
	>
		<div
			class="flex min-w-0 flex-wrap items-center justify-between gap-3 border-y bg-gray-50 px-4 py-3"
		>
			<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<span class="mr-1 text-sm font-medium">Évhasábok</span>
				<button
					v-for="year in availableYears"
					:key="year"
					:aria-checked="selectedYears.includes(year)"
					class="border-input bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm"
					:data-state="selectedYears.includes(year) ? 'checked' : 'unchecked'"
					role="switch"
					type="button"
					@click="toggleYear(year)"
				>
					<Eye
						v-if="selectedYears.includes(year)"
						class="size-4"
					/>
					<EyeOff
						v-else
						class="size-4"
					/>
					{{ year }}
				</button>
			</div>
			<Button
				:disabled="expandedPaths.size === 0"
				class="shrink-0"
				size="sm"
				variant="outline"
				@click="collapseAll"
			>
				<ChevronsUp />
				Összecsukás
			</Button>
		</div>

		<div class="flex flex-wrap items-center gap-4 px-4 text-xs">
			<span class="flex items-center gap-2">
				<span class="size-3 border border-emerald-300 bg-emerald-100" />
				Azonos kód és megnevezés
			</span>
			<span class="flex items-center gap-2">
				<span class="size-3 border border-red-300 bg-red-100" />
				Eltérő megnevezés vagy hiányzó kód
			</span>
		</div>

		<Alert
			v-if="activeYears.length === 0"
			class="mx-4"
		>
			<AlertDescription>Kapcsolj be legalább egy évhasábot.</AlertDescription>
		</Alert>

		<template v-else>
			<div
				ref="topScroll"
				:aria-label="`${economicViewLabel} vízszintes görgetése`"
				class="sticky top-0 z-30 h-5 overflow-x-auto overflow-y-hidden border-y bg-white shadow-sm"
				role="region"
				@scroll="syncHorizontalScroll(topScroll, tableScroll)"
			>
				<div
					class="h-px"
					:style="{ minWidth: gridStyle.minWidth }"
				/>
			</div>

			<div
				ref="tableScroll"
				class="overflow-x-auto border-b"
				@scroll="syncHorizontalScroll(tableScroll, topScroll)"
			>
			<div
				class="sticky top-0 z-10 grid border-b bg-white"
				:style="gridStyle"
			>
				<div
					class="bg-muted sticky left-0 z-20 flex items-center justify-center border-r px-2 py-3 text-center text-xs font-semibold"
				>
					Idősoron szerepel
				</div>
				<div
					v-for="year in activeYears"
					:key="year"
					class="border-r px-4 py-3 last:border-r-0"
				>
					<div class="font-semibold">{{ year }}</div>
					<div class="text-muted-foreground text-xs">{{ economicViewLabel }}</div>
				</div>
			</div>

			<div
				v-for="row in comparisonRows"
				:key="row.path"
				class="grid border-b last:border-b-0"
				:style="gridStyle"
			>
				<div
					class="sticky left-0 z-10 flex min-h-16 flex-col items-center justify-center gap-1 border-r bg-gray-50 px-2 py-2"
				>
					<button
						:aria-checked="timelineCodeIds.has(row.code)"
						:aria-label="`${row.code} idősoros megjelenítése`"
						:disabled="!isTimelineCodeLimitEnabled"
						class="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
						:class="
							cn(
								timelineCodeIds.has(row.code) ? 'bg-primary' : 'bg-gray-300',
								!isTimelineCodeLimitEnabled && 'cursor-not-allowed opacity-50',
							)
						"
						:data-state="timelineCodeIds.has(row.code) ? 'checked' : 'unchecked'"
						role="switch"
						:title="
							isTimelineCodeLimitEnabled
								? `${row.code} idősoros megjelenítése`
								: 'A KGR rovatokra korlátozás nincs bekapcsolva'
						"
						type="button"
						@click="toggleTimelineCode(row.code)"
					>
						<span
							:class="
								cn(
									'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform',
									timelineCodeIds.has(row.code) && 'translate-x-4',
								)
							"
						/>
					</button>
					<div
						v-if="row.hasMixedTimelineCodes"
						class="flex items-start gap-1 text-[10px] leading-tight text-amber-700"
					>
						<AlertCircle class="mt-px size-3 shrink-0" />
						<span>Vegyes jelölés a szülő alatt.</span>
					</div>
				</div>
				<div
					v-for="year in activeYears"
					:key="year"
					:class="
						cn(
							'group relative min-h-16 border-r px-3 py-2 last:border-r-0',
							row.status === 'same' &&
								'border-l-2 border-l-emerald-500 bg-emerald-50/70',
							row.status === 'different' &&
								'border-l-2 border-l-red-500 bg-red-50/70',
							!timelineCodeIds.has(row.code) && '[border-left-style:dashed]',
							(!row.nodes[year] || !row.nodes[year]?.isChartVisible) && 'bg-gray-100',
							row.nodes[year] &&
								!row.nodes[year]?.isChartVisible &&
								'text-muted-foreground',
						)
					"
				>
					<Button
						:aria-label="
							row.nodes[year]
								? `${year} ${row.nodes[year]?.code} elé új sor beszúrása`
								: `${year} ${row.code} tétel hozzáadása`
						"
						class="bg-background text-muted-foreground absolute -top-3 left-1/2 z-10 size-6 -translate-x-1/2 rounded-full border opacity-70 shadow-sm hover:opacity-100"
						size="icon"
						:title="
							row.nodes[year]
								? `${row.nodes[year]?.code} elé új sor beszúrása`
								: `${row.code} tétel hozzáadása`
						"
						variant="ghost"
						@click="
							row.nodes[year]
								? openInsert(year, row.nodes[year]!)
								: openMissingInsert(year, row)
						"
					>
						<Plus class="size-3.5" />
					</Button>
					<div
						class="flex h-full items-start gap-1"
						:style="{ paddingLeft: `${row.depth * 16}px` }"
					>
						<button
							v-if="row.hasChildren && row.nodes[year]"
							:aria-label="
								expandedPaths.has(row.path)
									? 'Tétel összecsukása'
									: 'Tétel lenyitása'
							"
							class="mt-0.5 size-6 shrink-0"
							type="button"
							@click="togglePath(row.path)"
						>
							<ChevronDown
								v-if="expandedPaths.has(row.path)"
								class="size-4"
							/>
							<ChevronRight
								v-else
								class="size-4"
							/>
						</button>
						<span
							v-else
							class="block size-6 shrink-0"
						/>

						<div
							v-if="row.nodes[year]"
							class="min-w-0 flex-1"
						>
							<div class="mb-1 flex items-center justify-between gap-2">
								<div class="flex min-w-0 items-center gap-2">
									<code class="shrink-0 text-xs font-semibold">{{
										row.nodes[year]?.code
									}}</code>
									<span
										class="text-muted-foreground truncate text-xs tabular-nums"
									>
										{{ formatAmount(row.nodes[year]?.value) }} Ft
									</span>
									<Tooltip v-if="hasAmountMismatch(row.nodes[year]!)">
										<TooltipTrigger as-child>
											<span
												:aria-label="amountMismatchDescription(row.nodes[year]!)"
												class="shrink-0 text-amber-600"
												role="img"
												tabindex="0"
											>
												<AlertTriangle class="size-3.5" />
											</span>
										</TooltipTrigger>
										<TooltipContent class="max-w-xs">
											{{ amountMismatchDescription(row.nodes[year]!) }}
										</TooltipContent>
									</Tooltip>
								</div>
								<div class="flex shrink-0 items-center">
									<button
										v-if="row.nodes[year]?.value === 0"
										:aria-checked="row.nodes[year]?.isChartVisible"
										:aria-label="`${year} ${row.nodes[year]?.code} ${
											row.nodes[year]?.isChartVisible
												? 'elrejtése az ábrákról'
												: 'megjelenítése az ábrákon'
										}`"
										:class="
											cn(
												'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
												row.nodes[year]?.isChartVisible
													? 'bg-primary'
													: 'bg-gray-300',
											)
										"
										role="switch"
										:title="
											row.nodes[year]?.isChartVisible
												? 'Elrejtés az ábrákról'
												: 'Megjelenítés az ábrákon'
										"
										type="button"
										@click="toggleChartVisibility(year, row.nodes[year]!)"
									>
										<span
											:class="
												cn(
													'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform',
													row.nodes[year]?.isChartVisible &&
														'translate-x-4',
												)
											"
										/>
									</button>
									<Button
										v-if="isPlaceholder(row.nodes[year]!)"
										:aria-label="`${year} ${row.nodes[year]?.code} placeholder törlése`"
										class="text-destructive size-7 opacity-70 group-hover:opacity-100"
										size="icon"
										:title="`${row.nodes[year]?.code} placeholder törlése`"
										variant="ghost"
										@click="deletePlaceholder(year, row.nodes[year]!)"
									>
										<Trash2 class="size-4" />
									</Button>
									<Tooltip>
										<TooltipTrigger as-child>
											<Button
												:aria-label="`${year} ${row.nodes[year]?.code} súgószövege`"
												:class="
												hasTooltip(year, row.nodes[year]!.code)
													? 'text-emerald-600 hover:text-emerald-700'
													: hasTooltipInOtherYear(year, row.nodes[year]!.code)
														? 'text-orange-500 hover:text-orange-600'
														: 'text-gray-400 hover:text-gray-600'
												"
												class="size-7 opacity-80 group-hover:opacity-100"
												size="icon"
												variant="ghost"
												@click="openTooltipEditor(year, row.nodes[year]!)"
											>
												<CircleHelp
													:class="
														cn(
															'size-4',
															hasTooltipInOtherYear(year, row.nodes[year]!.code) &&
																'[&_circle]:[stroke-dasharray:3_2]',
														)
													"
												/>
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											{{ tooltipButtonHint(year, row.nodes[year]!.code) }}
										</TooltipContent>
									</Tooltip>
									<Button
										:aria-label="`${year} ${row.nodes[year]?.code} szerkesztése`"
										class="size-7 opacity-70 group-hover:opacity-100"
										size="icon"
										:title="`${row.nodes[year]?.code} szerkesztése`"
										variant="ghost"
										@click="openEditor(year, row.nodes[year]!)"
									>
										<Pencil class="size-4" />
									</Button>
								</div>
							</div>
							<div
								:class="
									cn(
										'text-sm leading-snug',
										!row.nodes[year]?.name && 'text-muted-foreground italic',
									)
								"
							>
								{{ row.nodes[year]?.name || 'Névtelen placeholder' }}
							</div>
						</div>
						<div
							v-else
							class="text-muted-foreground flex min-h-10 items-center text-xs italic"
						>
							Ebben az évben nincs ilyen kód
						</div>
					</div>
				</div>
			</div>
			</div>
		</template>
	</section>

	<Dialog v-model:open="editorOpen">
		<DialogContent class="sm:max-w-xl">
			<DialogHeader>
				<DialogTitle>Tétel szerkesztése</DialogTitle>
				<DialogDescription>
					A módosítás a {{ editYear }} évi {{ sideAdjective }} munkalap megfelelő sorába
					kerül.
				</DialogDescription>
			</DialogHeader>
			<Alert variant="destructive">
				<AlertTriangle />
				<AlertDescription>
					A kód határozza meg a tétel helyét a hierarchiában. Kódot csak indokolt esetben
					módosíts.
				</AlertDescription>
			</Alert>
			<div class="grid gap-4 py-2">
				<label class="grid gap-1">
					<span class="text-sm font-medium">Kód</span>
					<Input
						v-model="editCode"
						class="font-mono"
					/>
				</label>
				<label class="grid gap-1">
					<span class="text-sm font-medium">Tétel neve</span>
					<Input v-model="editName" />
				</label>
				<label class="grid gap-1">
					<span class="text-sm font-medium">Összeg (Ft)</span>
					<Input
						v-model="editAmount"
						inputmode="decimal"
					/>
				</label>
			</div>
			<DialogFooter>
				<DialogClose as-child>
					<Button variant="outline">Mégse</Button>
				</DialogClose>
				<Button @click="applyEdit">Módosítás alkalmazása</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>

	<Dialog v-model:open="insertOpen">
		<DialogContent class="sm:max-w-xl">
			<DialogHeader>
				<DialogTitle>Új sor beszúrása</DialogTitle>
				<DialogDescription v-if="insertMode === 'before'">
					A sor a {{ insertYear }} évi {{ insertNode?.code }} tétel elé kerül.
				</DialogDescription>
				<DialogDescription v-else>
					A {{ insertCode }} kódú tétel bekerül a {{ insertYear }} évi hierarchiába.
				</DialogDescription>
			</DialogHeader>
			<Alert v-if="insertMode === 'before'">
				<AlertTriangle />
				<AlertDescription>
					A kijelölt és az utána következő tételek sorszáma eggyel nő. Az érintett
					altételek kódja is követi a szülőjük új kódját.
				</AlertDescription>
			</Alert>
			<div class="grid gap-4 py-2">
				<div class="grid gap-1">
					<span class="text-sm font-medium">Új kód</span>
					<code class="bg-muted w-fit rounded px-2 py-1 text-sm font-semibold">
						{{ insertCode }}
					</code>
				</div>
				<label class="grid gap-1">
					<span class="text-sm font-medium">Tétel neve (elhagyható)</span>
					<Input
						v-model="insertName"
						placeholder="Üresen hagyva placeholder sor jön létre"
					/>
				</label>
				<label class="grid gap-1">
					<span class="text-sm font-medium">Összeg (Ft)</span>
					<Input
						v-model="insertAmount"
						inputmode="decimal"
					/>
				</label>
			</div>
			<DialogFooter>
				<DialogClose as-child>
					<Button variant="outline">Mégse</Button>
				</DialogClose>
				<Button @click="applyInsert">Sor beszúrása</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>

	<ItemTooltipEditor
		v-if="tooltipNode"
		v-model:open="tooltipEditorOpen"
		:code="tooltipNode.code"
		:name="tooltipNode.name"
		:names-by-year="tooltipNamesByYear"
		:year="tooltipYear"
		:years="availableYears"
	/>
</template>
