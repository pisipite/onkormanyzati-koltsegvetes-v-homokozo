<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import type { Worksheet } from 'exceljs';
import { generateEconomicTree } from '../../../scripts/prepare-data-lib';
import type { BudgetNode } from '../../../src/utils/types';

type PickerOption = {
	group?: string;
	label?: string;
	value: string;
};

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
const mediaFiles = ref<string[]>([]);

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
	rows.value.filter((row) => row.values.year?.trim() === selectedYear.value),
);

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
		onlyOnMap: '',
	});
	await nextTick();

	const newRow = filteredRows.value.at(-1);
	if (!newRow) return;

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
			class="grid gap-4"
		>
			<ConfigMilestoneCard
				v-for="(row, index) in filteredRows"
				:key="row.rowNumber"
				:image-files="imageFiles"
				:index="index"
				:node-options="nodeOptions"
				:row="row"
				:tag-options="tagOptions"
				:total="filteredRows.length"
				:video-files="videoFiles"
				@delete="deleteMilestone"
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
		<div class="mt-4 flex justify-end">
			<Button
				:disabled="!selectedYear"
				type="button"
				@click="addMilestone"
			>
				<Plus />
				Új kártya
			</Button>
		</div>
	</section>
</template>
