<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next';
import type { Worksheet } from 'exceljs';
import { generateEconomicTree } from '../../../scripts/prepare-data-lib';
import type { BudgetNode } from '../../../src/utils/types';

type PickerOption = {
	group?: string;
	label?: string;
	value: string;
};

type PlacementFilter = 'all' | 'map-only' | 'both';

const PAGE_SIZE = 20;

const {
	addSheetRow,
	deleteSheetRow,
	readConfigValue,
	readSheetRows,
	swapSheetRows,
	writeSheetValue,
} = await useConfigData();
const { emptyFuncTree, workbook, years: budgetYears } = await useBudgetData();

const selectedYear = ref('');
const placementFilter = ref<PlacementFilter>('all');
const currentPage = ref(1);
const mediaFiles = ref<string[]>([]);
const listTop = useTemplateRef<HTMLElement>('listTop');
const duplicateDialogOpen = ref(false);
const duplicateSourceRowNumber = ref<number>();
const duplicateTargetYear = ref('');

const rows = computed(() => readSheetRows('milestones'));

const years = computed(() =>
	Array.from(
		new Set([
			...Object.keys(budgetYears.value || {}),
			...rows.value
				.map((row) => row.values.year?.trim())
				.filter((year): year is string => !!year),
		]),
	).sort((a, b) => b.localeCompare(a, 'hu', { numeric: true })),
);

const duplicateSourceRow = computed(() =>
	rows.value.find((row) => row.rowNumber === duplicateSourceRowNumber.value),
);

const duplicateTargetYears = computed(() => {
	const sourceYear = duplicateSourceRow.value?.values.year?.trim();
	return years.value.filter((year) => year !== sourceYear);
});

watch(
	years,
	(yearList) => {
		if (yearList.includes(selectedYear.value)) return;
		const defaultYear = readConfigValue('defaultYear');
		selectedYear.value = yearList.includes(defaultYear) ? defaultYear : yearList[0] || '';
	},
	{ immediate: true },
);

const filteredRows = computed(() =>
	rows.value.filter((row) => {
		if (row.values.year?.trim() !== selectedYear.value) return false;
		if (placementFilter.value === 'map-only') return row.values.onlyOnMap === '1';
		if (placementFilter.value === 'both') return row.values.onlyOnMap !== '1';
		return true;
	}),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / PAGE_SIZE)));
const pageStart = computed(() => (currentPage.value - 1) * PAGE_SIZE);
const pagedRows = computed(() =>
	filteredRows.value.slice(pageStart.value, pageStart.value + PAGE_SIZE),
);

watch([selectedYear, placementFilter], () => {
	currentPage.value = 1;
});

watch(pageCount, (count) => {
	currentPage.value = Math.min(currentPage.value, count);
});

const imageFiles = computed(() =>
	mediaFiles.value.filter((fileName) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(fileName)),
);

const videoFiles = computed(() =>
	mediaFiles.value.filter((fileName) => /\.(m4v|mov|mp4|webm)$/i.test(fileName)),
);

const tagOptions = computed<PickerOption[]>(() =>
	Array.from(
		new Set(
			rows.value.flatMap((row) =>
				(row.values.tags || '')
					.split(',')
					.map((tag) => tag.trim())
					.filter(Boolean),
			),
		),
	)
		.sort((a, b) => a.localeCompare(b, 'hu', { numeric: true }))
		.map((tag) => ({ value: tag })),
);

const nodeOptions = computed<PickerOption[]>(() => {
	const selectedBudgetYear = budgetYears.value?.[selectedYear.value];
	if (!selectedBudgetYear || !workbook.value) return [];

	const options: PickerOption[] = [];
	const seen = new Set<string>();
	const sides = [
		{
			group: 'Bevétel - közgazdasági',
			rootId: 'B',
			sheetName: selectedBudgetYear.incomeSheet,
		},
		{
			group: 'Kiadás - közgazdasági',
			rootId: 'K',
			sheetName: selectedBudgetYear.expenseSheet,
		},
	];

	for (const side of sides) {
		const sheet = workbook.value.getWorksheet(side.sheetName);
		if (!sheet) continue;
		const tree = generateEconomicTree(sheet);
		tree.id = side.rootId;
		(tree.children || []).forEach((node) =>
			addBudgetNodeOption(node, side.group, options, seen),
		);
	}

	const expenseSheet = workbook.value.getWorksheet(selectedBudgetYear.expenseSheet);
	if (expenseSheet) addFunctionalOptionsFromSheet(expenseSheet, options, seen);

	return options;
});

function addBudgetNodeOption(
	node: BudgetNode,
	group: string,
	options: PickerOption[],
	seen: Set<string>,
) {
	const value = String(node.id || '').trim();
	if (value && !seen.has(value)) {
		seen.add(value);
		options.push({
			group,
			value,
			label: `${value} - ${node.name}`,
		});
	}
	(node.children || []).forEach((child) => addBudgetNodeOption(child, group, options, seen));
}

function addFunctionalOptionsFromSheet(
	sheet: Worksheet,
	options: PickerOption[],
	seen: Set<string>,
) {
	const headerRow = sheet.getRow(2);
	for (let columnNumber = 4; columnNumber <= headerRow.cellCount; columnNumber++) {
		const rawHeader = headerRow.getCell(columnNumber).value?.toString() || '';
		const codeMatch = rawHeader.trim().match(/^(\d+)/);
		if (!codeMatch) continue;

		const value = codeMatch[1];
		if (seen.has(value)) continue;

		const name =
			rawHeader
				.slice(value.length)
				.replace(/^[-\s]+/, '')
				.trim() ||
			emptyFuncTree.value?.[Number(value)]?.name ||
			value;

		seen.add(value);
		options.push({
			group: 'Funkcionális',
			value,
			label: `${value} - ${name}`,
		});
	}
}

async function updateMediaFiles() {
	mediaFiles.value = await $fetch<string[]>('/api/ms');
}

function setRowValue(rowNumber: number, header: string, value: string) {
	writeSheetValue('milestones', rowNumber, header, value);
}

async function addMilestone() {
	if (!selectedYear.value) return;
	addSheetRow('milestones', {
		year: selectedYear.value,
		title: 'Új fejlesztéskártya',
		descriptionInMarkdown: '',
		imageFile: '',
		videoFile: '',
		nodeId: '',
		tags: '',
		pos: '',
		onlyOnMap: placementFilter.value === 'map-only' ? '1' : '',
	});
	await nextTick();

	const newRow = filteredRows.value.at(-1);
	if (!newRow) return;
	currentPage.value = pageCount.value;
	await nextTick();

	const card = document.querySelector<HTMLElement>(
		`[data-milestone-row="${newRow.rowNumber}"]`,
	);
	card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	card?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}

function openDuplicateDialog(rowNumber: number) {
	duplicateSourceRowNumber.value = rowNumber;
	duplicateTargetYear.value = '';
	duplicateDialogOpen.value = true;
}

async function duplicateMilestone() {
	const sourceRow = duplicateSourceRow.value;
	const targetYear = duplicateTargetYear.value;
	if (!sourceRow || !targetYear) return;

	addSheetRow('milestones', {
		...sourceRow.values,
		year: targetYear,
	});
	selectedYear.value = targetYear;
	duplicateDialogOpen.value = false;
	await nextTick();

	const newRow = filteredRows.value.at(-1);
	if (!newRow) return;
	currentPage.value = pageCount.value;
	await nextTick();

	const card = document.querySelector<HTMLElement>(
		`[data-milestone-row="${newRow.rowNumber}"]`,
	);
	card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	card?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}

function deleteMilestone(rowNumber: number, title: string) {
	if (!confirm(`Biztosan törlöd ezt a kártyát? (${title || 'Cím nélküli kártya'})`)) return;
	deleteSheetRow('milestones', rowNumber);
}

function moveMilestone(rowNumber: number, direction: -1 | 1) {
	const currentIndex = filteredRows.value.findIndex((row) => row.rowNumber === rowNumber);
	const targetRow = filteredRows.value[currentIndex + direction];
	if (!targetRow) return;
	swapSheetRows('milestones', rowNumber, targetRow.rowNumber);
}

async function goToPage(page: number) {
	currentPage.value = Math.min(Math.max(page, 1), pageCount.value);
	await nextTick();
	listTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(updateMediaFiles);
</script>

<template>
	<section
		class="not-prose mx-auto w-full min-w-0 rounded-md border bg-slate-50/80 p-4 lg:w-[70%]"
	>
		<div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<div>
				<h2 class="text-lg font-semibold">Fejlesztéskártyák</h2>
				<p class="text-muted-foreground text-sm">
					A <code>milestones</code> munkalap kártyái év szerint szűrve.
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<Label for="milestones-year">Év</Label>
				<Select
					id="milestones-year"
					v-model="selectedYear"
				>
					<SelectTrigger class="bg-background min-w-40">
						<SelectValue placeholder="Év kiválasztása" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							v-for="year in years"
							:key="year"
							:value="year"
						>
							{{ year }}
						</SelectItem>
					</SelectContent>
				</Select>
				<Label for="milestones-placement">Megjelenés</Label>
				<Select
					id="milestones-placement"
					v-model="placementFilter"
				>
					<SelectTrigger class="bg-background min-w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Mind</SelectItem>
						<SelectItem value="map-only">Csak térképen</SelectItem>
						<SelectItem value="both">Csak mindkét helyen</SelectItem>
					</SelectContent>
				</Select>
				<Button
					:disabled="!selectedYear"
					type="button"
					@click="addMilestone"
				>
					<Plus />
					Új kártya
				</Button>
			</div>
		</div>

		<div
			v-if="filteredRows.length"
			ref="listTop"
			class="grid scroll-mt-6 gap-4"
		>
			<ConfigMilestoneCard
				v-for="(row, index) in pagedRows"
				:key="row.rowNumber"
				:image-files="imageFiles"
				:index="pageStart + index"
				:node-options="nodeOptions"
				:row="row"
				:tag-options="tagOptions"
				:total="filteredRows.length"
				:video-files="videoFiles"
				@delete="deleteMilestone"
				@duplicate="openDuplicateDialog"
				@move="moveMilestone"
				@update="setRowValue"
			/>
		</div>
		<div
			v-else
			class="text-muted-foreground rounded-md border border-dashed bg-white p-6 text-center text-sm"
		>
			Nincs megjeleníthető fejlesztéskártya a kiválasztott évhez.
		</div>
		<div class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
			<p
				v-if="filteredRows.length"
				class="text-muted-foreground text-sm"
			>
				{{ pageStart + 1 }}–{{ Math.min(pageStart + PAGE_SIZE, filteredRows.length) }} /
				{{ filteredRows.length }} kártya
			</p>
			<nav
				v-if="pageCount > 1"
				aria-label="Fejlesztéskártyák lapozása"
				class="flex items-center justify-center gap-2"
			>
				<Button
					aria-label="Előző oldal"
					:disabled="currentPage === 1"
					size="icon"
					type="button"
					variant="outline"
					@click="goToPage(currentPage - 1)"
				>
					<ChevronLeft />
				</Button>
				<span class="min-w-24 text-center text-sm font-medium">
					{{ currentPage }} / {{ pageCount }} oldal
				</span>
				<Button
					aria-label="Következő oldal"
					:disabled="currentPage === pageCount"
					size="icon"
					type="button"
					variant="outline"
					@click="goToPage(currentPage + 1)"
				>
					<ChevronRight />
				</Button>
			</nav>
			<Button
				:disabled="!selectedYear"
				class="sm:justify-self-end"
				type="button"
				@click="addMilestone"
			>
				<Plus />
				Új kártya
			</Button>
		</div>
	</section>

	<Dialog v-model:open="duplicateDialogOpen">
		<DialogContent class="sm:max-w-md">
			<form @submit.prevent="duplicateMilestone">
				<DialogHeader>
					<DialogTitle>Fejlesztéskártya másolása</DialogTitle>
					<DialogDescription>
						A(z) „{{ duplicateSourceRow?.values.title || 'Cím nélküli kártya' }}” kártya
						minden adata átkerül a kiválasztott évbe.
					</DialogDescription>
				</DialogHeader>

				<label class="my-5 grid gap-2">
					<span class="text-sm font-medium">Cél év</span>
					<Select v-model="duplicateTargetYear">
						<SelectTrigger class="w-full">
							<SelectValue placeholder="Válassz évet" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								v-for="year in duplicateTargetYears"
								:key="year"
								:value="year"
							>
								{{ year }}
							</SelectItem>
						</SelectContent>
					</Select>
					<span
						v-if="!duplicateTargetYears.length"
						class="text-muted-foreground text-sm"
					>
						Nincs másik elérhető év.
					</span>
				</label>

				<DialogFooter>
					<DialogClose as-child>
						<Button
							type="button"
							variant="outline"
						>
							Mégse
						</Button>
					</DialogClose>
					<Button
						:disabled="!duplicateTargetYear"
						type="submit"
					>
						Másolás
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
</template>
