<script setup lang="ts">
import { AlertCircle, CheckCircle2, Search, X } from 'lucide-vue-next';
import { generateEconomicTree } from '../../../scripts/prepare-data-lib';
import type { BudgetNode } from '../../../src/utils/types';

type CodeKind = 'expense-econ' | 'expense-func' | 'income-econ';

type CodeEntry = {
	appearsInYears: string[];
	id: string;
	kind: CodeKind;
	name: string;
	parentId: string;
	tooltip: string;
};

const tooltipIdHeader = 'Azon.';
const tooltipNameHeader = 'Megnevezés';
const tooltipTextHeader = 'Súgószöveg';

const {
	deleteSheetRowByHeaderValue,
	ensureSheet,
	readConfigValue,
	readSheetHeaders,
	readSheetRows,
	upsertSheetRow,
	writeSheetValue,
} = await useConfigData();
const { emptyFuncTree, workbook, years: budgetYears } = await useBudgetData();

const selectedYear = ref('');
const searchTerm = ref('');
const kindFilter = ref<'all' | CodeKind>('all');
const statusFilter = ref<'all' | 'changing-name' | 'kgr' | 'missing-tooltip'>('all');
const selectedCopyYears = ref<Record<string, string>>({});
const parentFilter = ref<{ kind: CodeKind; parentId: string } | null>(null);

const years = computed(() =>
	Object.keys(budgetYears.value || {}).sort((a, b) => b.localeCompare(a, 'hu', { numeric: true })),
);

watch(
	years,
	(yearList) => {
		if (yearList.includes(selectedYear.value)) return;
		selectedYear.value = yearList[0] || '';
	},
	{ immediate: true },
);

const tooltipSheetName = computed(() => (selectedYear.value ? `tooltips ${selectedYear.value}` : ''));
const tooltipRows = computed(() => readSheetRows(tooltipSheetName.value));
const tooltipRowsByYear = computed(() => {
	const map = new Map<string, Map<string, string>>();
	for (const year of years.value) {
		const yearMap = new Map<string, string>();
		readSheetRows(`tooltips ${year}`).forEach((row) => {
			const id = (row.values[tooltipIdHeader] || '').trim();
			const text = row.values[tooltipTextHeader] || '';
			if (id && text.trim()) yearMap.set(id, text);
		});
		map.set(year, yearMap);
	}
	return map;
});
const kgrHeaders = computed(() => readSheetHeaders('kgr'));
const kgrRows = computed(() => readSheetRows('kgr'));

const tooltipsById = computed(() => {
	const map = new Map<string, { rowNumber: number; text: string }>();
	tooltipRows.value.forEach((row) => {
		const id = (row.values['Azon.'] || '').trim();
		if (!id) return;
		map.set(id, {
			rowNumber: row.rowNumber,
			text: row.values['Súgószöveg'] || '',
		});
	});
	return map;
});

const kgrCodeHeader = computed(
	() => ['code', 'codes'].find((header) => kgrHeaders.value.includes(header)) || 'code',
);

const kgrLimitEnabled = computed(() =>
	['1', 'true', 'igen'].includes(readConfigValue('timeseries.kgrOnly').trim().toLowerCase()),
);

const kgrIds = computed(
	() =>
		new Set(
			kgrRows.value
				.map((row) => (row.values[kgrCodeHeader.value] || '').trim())
				.filter(Boolean),
		),
);

const allEntriesByYear = computed(() => {
	const map = new Map<string, CodeEntry[]>();
	for (const year of years.value) {
		map.set(year, collectEntriesForYear(year));
	}
	return map;
});

const selectedEntries = computed(() => {
	const entries = allEntriesByYear.value.get(selectedYear.value) || [];
	const term = searchTerm.value.trim().toLowerCase();
	return entries
		.map((entry) => ({
			...entry,
			appearsInYears: yearsForEntry(entry),
			tooltip: tooltipsById.value.get(entry.id)?.text || '',
		}))
		.filter((entry) => kindFilter.value === 'all' || entry.kind === kindFilter.value)
		.filter(
			(entry) =>
				!parentFilter.value ||
				(entry.kind === parentFilter.value.kind &&
					entry.parentId === parentFilter.value.parentId),
		)
		.filter((entry) => {
			if (statusFilter.value === 'missing-tooltip') return !entry.tooltip.trim();
			if (statusFilter.value === 'kgr') return kgrIds.value.has(entry.id);
			if (statusFilter.value === 'changing-name') return namesForEntry(entry).length > 1;
			return true;
		})
		.filter((entry) => {
			if (!term) return true;
			return `${entry.id} ${entry.name}`.toLowerCase().includes(term);
		});
});

const allKnownIds = computed(
	() =>
		new Set(
			Array.from(allEntriesByYear.value.values()).flatMap((entries) =>
				entries.map((entry) => entry.id),
			),
		),
);

const staleKgrIds = computed(() =>
	Array.from(kgrIds.value)
		.filter((id) => !allKnownIds.value.has(id))
		.sort((a, b) => a.localeCompare(b, 'hu', { numeric: true })),
);

const missingTooltipCount = computed(
	() => selectedEntries.value.filter((entry) => !entry.tooltip.trim()).length,
);

const changingCount = computed(
	() =>
		(allEntriesByYear.value.get(selectedYear.value) || []).filter(
			(entry) => namesForEntry(entry).length > 1,
		).length,
);

const mixedKgrParentKeys = computed(() => {
	const map = new Map<string, { disabled: number; enabled: number }>();
	for (const entry of allEntriesByYear.value.get(selectedYear.value) || []) {
		if (!entry.parentId) continue;
		const key = `${entry.kind}:${entry.parentId}`;
		const group = map.get(key) || { disabled: 0, enabled: 0 };
		if (kgrIds.value.has(entry.id)) {
			group.enabled++;
		} else {
			group.disabled++;
		}
		map.set(key, group);
	}
	return new Set(
		Array.from(map.entries())
			.filter(([, group]) => group.enabled > 0 && group.disabled > 0)
			.map(([key]) => key),
	);
});

function collectEntriesForYear(year: string) {
	const selectedBudgetYear = budgetYears.value?.[year];
	if (!selectedBudgetYear || !workbook.value) return [];

	const entries: CodeEntry[] = [];
	const seen = new Set<string>();
	addEconomicEntries(selectedBudgetYear.incomeSheet, 'income-econ', entries, seen);
	addEconomicEntries(selectedBudgetYear.expenseSheet, 'expense-econ', entries, seen);
	addFunctionalEntries(selectedBudgetYear.expenseSheet, entries, seen);
	return entries.sort((a, b) => a.id.localeCompare(b.id, 'hu', { numeric: true }));
}

function addEconomicEntries(
	sheetName: string,
	kind: CodeKind,
	entries: CodeEntry[],
	seen: Set<string>,
) {
	const sheet = workbook.value?.getWorksheet(sheetName);
	if (!sheet) return;
	const tree = generateEconomicTree(sheet);
	(tree.children || []).forEach((node) => addBudgetNodeEntry(node, kind, entries, seen, ''));
}

function addBudgetNodeEntry(
	node: BudgetNode,
	kind: CodeKind,
	entries: CodeEntry[],
	seen: Set<string>,
	parentId: string,
) {
	const id = String(node.id || '').trim();
	const key = `${kind}:${id}`;
	if (id && !seen.has(key)) {
		seen.add(key);
		entries.push({
			appearsInYears: [],
			id,
			kind,
			name: node.name,
			parentId,
			tooltip: '',
		});
	}
	(node.children || []).forEach((child) => addBudgetNodeEntry(child, kind, entries, seen, id));
}

function addFunctionalEntries(sheetName: string, entries: CodeEntry[], seen: Set<string>) {
	const sheet = workbook.value?.getWorksheet(sheetName);
	if (!sheet) return;
	const headerRow = sheet.getRow(2);
	for (let columnNumber = 4; columnNumber <= headerRow.cellCount; columnNumber++) {
		const cell = headerRow.getCell(columnNumber);
		const rawHeader = cell.text || cell.value?.toString() || '';
		const codeMatch = rawHeader.trim().match(/^(\d+)/);
		if (!codeMatch) continue;
		const id = codeMatch[1]!;
		const key = `expense-func:${id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		entries.push({
			appearsInYears: [],
			id,
			kind: 'expense-func',
			name: functionalName(id, rawHeader),
			parentId: functionalParentId(id),
			tooltip: '',
		});
	}
}

function functionalParentId(id: string) {
	return String(emptyFuncTree.value?.[Number(id)]?.parent || '');
}

function functionalName(id: string, rawHeader: string) {
	return (
		rawHeader
			.slice(id.length)
			.replace(/^[-\s]+/, '')
			.trim() ||
		emptyFuncTree.value?.[Number(id)]?.name ||
		id
	);
}

function yearsForEntry(entry: CodeEntry) {
	return years.value.filter((year) =>
		(allEntriesByYear.value.get(year) || []).some(
			(candidate) => candidate.id === entry.id && candidate.kind === entry.kind,
		),
	);
}

function namesForEntry(entry: CodeEntry) {
	const names = new Map<string, string[]>();
	for (const year of years.value) {
		const candidate = (allEntriesByYear.value.get(year) || []).find(
			(item) => item.id === entry.id && item.kind === entry.kind,
		);
		if (!candidate) continue;
		const name = candidate.name.trim();
		names.set(name, [...(names.get(name) || []), year]);
	}
	return Array.from(names.entries()).map(([name, nameYears]) => ({ name, years: nameYears }));
}

function tooltipSources(entry: CodeEntry) {
	return years.value
		.filter((year) => year !== selectedYear.value)
		.sort((a, b) => Number(b) - Number(a))
		.map((year) => tooltipSourceForYear(entry, year))
		.filter((source): source is { tooltip: string; year: string } => !!source);
}

function tooltipSourceForYear(entry: CodeEntry, year: string) {
		const candidate = (allEntriesByYear.value.get(year) || []).find(
			(item) =>
				item.id === entry.id &&
				item.kind === entry.kind &&
				item.name.trim() === entry.name.trim(),
		);
		if (!candidate) return null;
		const tooltip = tooltipRowsByYear.value.get(year)?.get(entry.id) || '';
		return tooltip.trim() ? { tooltip, year } : null;
}

function copyYearKey(entry: CodeEntry) {
	return `${selectedYear.value}:${entry.kind}:${entry.id}`;
}

function kindLabel(kind: CodeKind) {
	if (kind === 'income-econ') return 'Bevétel - közgazdasági';
	if (kind === 'expense-econ') return 'Kiadás - közgazdasági';
	return 'Kiadás - funkcionális';
}

const parentFilterLabel = computed(() => {
	if (!parentFilter.value) return '';
	const parentEntry = (allEntriesByYear.value.get(selectedYear.value) || []).find(
		(entry) =>
			entry.kind === parentFilter.value?.kind && entry.id === parentFilter.value.parentId,
	);
	return [
		parentFilter.value.parentId,
		parentEntry?.name,
		kindLabel(parentFilter.value.kind),
	]
		.filter(Boolean)
		.join(' - ');
});

function setParentFilter(entry: CodeEntry) {
	if (!entry.parentId) return;
	parentFilter.value = { kind: entry.kind, parentId: entry.parentId };
}

function clearParentFilter() {
	parentFilter.value = null;
}

function hasMixedKgrSiblings(entry: CodeEntry) {
	return Boolean(entry.parentId && mixedKgrParentKeys.value.has(`${entry.kind}:${entry.parentId}`));
}

function setTooltip(entry: CodeEntry, value: string) {
	if (!tooltipSheetName.value) return;
	ensureSheet(tooltipSheetName.value, [tooltipIdHeader, tooltipNameHeader, tooltipTextHeader]);
	const existing = tooltipsById.value.get(entry.id);
	if (existing) {
		writeSheetValue(tooltipSheetName.value, existing.rowNumber, tooltipTextHeader, value);
		return;
	}
	upsertSheetRow(tooltipSheetName.value, tooltipIdHeader, entry.id, {
		[tooltipIdHeader]: entry.id,
		[tooltipNameHeader]: entry.name,
		[tooltipTextHeader]: value,
	});
}

function copyTooltipFromYear(entry: CodeEntry, year: string) {
	const source = tooltipSourceForYear(entry, year);
	if (!source) return;
	setTooltip(entry, source.tooltip);
}

function selectedCopyYear(entry: CodeEntry) {
	return selectedCopyYears.value[copyYearKey(entry)] || '';
}

function setSelectedCopyYear(entry: CodeEntry, year: string) {
	selectedCopyYears.value = {
		...selectedCopyYears.value,
		[copyYearKey(entry)]: year,
	};
}

function setKgr(entry: CodeEntry, enabled: boolean) {
	if (!kgrLimitEnabled.value) return;
	if (enabled) {
		upsertSheetRow('kgr', kgrCodeHeader.value, entry.id, { [kgrCodeHeader.value]: entry.id });
	} else {
		deleteSheetRowByHeaderValue('kgr', kgrCodeHeader.value, entry.id);
	}
}

const allVisibleKgrEnabled = computed(
	() => selectedEntries.value.length > 0 && selectedEntries.value.every((entry) => kgrIds.value.has(entry.id)),
);

function toggleVisibleKgr() {
	if (!kgrLimitEnabled.value) return;
	const shouldEnable = !allVisibleKgrEnabled.value;
	for (const entry of selectedEntries.value) {
		setKgr(entry, shouldEnable);
	}
}

function updateTooltipSheetNames() {
	if (!tooltipSheetName.value) return;
	for (const entry of allEntriesByYear.value.get(selectedYear.value) || []) {
		const tooltip = tooltipsById.value.get(entry.id);
		if (!tooltip) continue;
		writeSheetValue(tooltipSheetName.value, tooltip.rowNumber, tooltipNameHeader, entry.name);
	}
}
</script>

<template>
	<section
		class="not-prose mx-auto w-full min-w-0 rounded-md border bg-slate-50/80 p-4 lg:w-[70%]"
	>
		<div class="mb-4">
			<h2 class="text-lg font-semibold">Rovatkódok követése</h2>
			<p class="text-muted-foreground text-sm">
				A budget munkalapokban szereplő közgazdasági és funkcionális kódok súgói,
				KGR/idősor jelölései és évközi eltérései.
			</p>
		</div>
		<div class="space-y-4">
			<div class="grid gap-3 lg:grid-cols-4">
				<div class="rounded-md border bg-sky-50 px-3 py-2">
					<div class="text-muted-foreground text-xs">Kiválasztott év kódjai</div>
					<div class="text-xl font-semibold">{{ selectedEntries.length }}</div>
				</div>
				<div class="rounded-md border bg-amber-50 px-3 py-2">
					<div class="text-muted-foreground text-xs">Hiányzó súgó</div>
					<div class="text-xl font-semibold">{{ missingTooltipCount }}</div>
				</div>
				<div class="rounded-md border bg-emerald-50 px-3 py-2">
					<div class="text-muted-foreground text-xs">Idősoron megjelenik</div>
					<div class="text-xl font-semibold">{{ kgrIds.size }}</div>
				</div>
				<div class="rounded-md border bg-slate-50 px-3 py-2">
					<div class="text-muted-foreground text-xs">Eltérő megnevezés</div>
					<div class="text-xl font-semibold">{{ changingCount }}</div>
				</div>
			</div>

			<div
				v-if="staleKgrIds.length"
				class="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0 text-amber-700" />
				<div>
					<div class="font-medium">A KGR-listában van, de a költségvetésben nem látszik:</div>
					<div class="text-muted-foreground break-words">{{ staleKgrIds.join(', ') }}</div>
				</div>
			</div>

			<div
				v-if="!kgrLimitEnabled"
				class="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm"
			>
				A kapcsolók akkor használhatók, ha az Idősor blokkban a
				<strong>KGR rovatokra korlátozás</strong> be van kapcsolva.
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<Label for="code-year">Év</Label>
				<Select
					id="code-year"
					v-model="selectedYear"
				>
					<SelectTrigger class="w-36">
						<SelectValue placeholder="Év" />
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

				<Select v-model="kindFilter">
					<SelectTrigger class="w-56">
						<SelectValue placeholder="Kódtípus" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Minden kódtípus</SelectItem>
						<SelectItem value="income-econ">Bevétel - közgazdasági</SelectItem>
						<SelectItem value="expense-econ">Kiadás - közgazdasági</SelectItem>
						<SelectItem value="expense-func">Kiadás - funkcionális</SelectItem>
					</SelectContent>
				</Select>

				<Select v-model="statusFilter">
					<SelectTrigger class="w-52">
						<SelectValue placeholder="Státusz" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Minden státusz</SelectItem>
						<SelectItem value="missing-tooltip">Hiányzó súgó</SelectItem>
							<SelectItem value="kgr">Idősoron megjelenik</SelectItem>
						<SelectItem value="changing-name">Eltérő megnevezés</SelectItem>
					</SelectContent>
				</Select>

				<div class="relative min-w-72 flex-1">
					<Search class="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
					<Input
						v-model="searchTerm"
						class="pl-8"
						placeholder="Keresés kód vagy megnevezés szerint"
					/>
				</div>

				<Button
					type="button"
					variant="secondary"
					@click="updateTooltipSheetNames"
				>
					Megnevezések frissítése
				</Button>
			</div>

			<div class="overflow-hidden rounded-md border">
				<div class="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
					<div class="font-semibold">Rovatkódok</div>
					<div
						v-if="parentFilter"
						class="flex min-w-0 items-center gap-2 rounded-md border bg-sky-50 px-2 py-1 text-xs"
					>
						<span class="text-muted-foreground shrink-0">Szűrés szülő szerint:</span>
						<span class="truncate font-medium">{{ parentFilterLabel }}</span>
						<Button
							aria-label="Szülő szűrés törlése"
							class="size-6"
							size="icon"
							type="button"
							variant="ghost"
							@click="clearParentFilter"
						>
							<X class="size-3.5" />
						</Button>
					</div>
				</div>
				<div class="bg-muted grid grid-cols-[9rem_8rem_minmax(18rem,1fr)_8rem_minmax(10rem,14rem)] gap-3 px-3 py-2 text-xs font-semibold">
					<div>Kód</div>
					<div>Szülő</div>
					<div>Súgószöveg</div>
					<div class="space-y-1">
						<div>Idősoron szerepel</div>
						<Button
							:disabled="!kgrLimitEnabled || !selectedEntries.length"
							class="h-7 px-2 text-xs"
							type="button"
							variant="secondary"
							@click="toggleVisibleKgr"
						>
							Mindet kapcsol
						</Button>
					</div>
					<div>Megnevezések</div>
				</div>
				<div>
					<div
						v-for="entry in selectedEntries"
						:key="`${entry.kind}-${entry.id}`"
						class="grid grid-cols-[9rem_8rem_minmax(18rem,1fr)_8rem_minmax(10rem,14rem)] gap-3 border-t px-3 py-3 text-sm"
					>
						<div class="min-w-0">
							<div class="font-mono font-semibold">{{ entry.id }}</div>
							<div class="text-muted-foreground truncate text-xs">{{ entry.name }}</div>
						</div>
						<div>
							<button
								v-if="entry.parentId"
								class="rounded px-1 py-0.5 font-mono text-sm font-semibold text-sky-700 hover:bg-sky-50 hover:underline"
								type="button"
								@click="setParentFilter(entry)"
							>
								{{ entry.parentId }}
							</button>
							<span
								v-else
								class="text-muted-foreground font-mono text-sm"
								>—</span
							>
						</div>
						<div>
							<Textarea
								:model-value="entry.tooltip"
								class="min-h-20 resize-y bg-white"
								placeholder="Súgószöveg"
								@update:model-value="setTooltip(entry, String($event))"
							/>
							<div
								v-if="
									!entry.tooltip.trim() &&
									namesForEntry(entry).length === 1 &&
									tooltipSources(entry).length
								"
								class="mt-2 flex flex-wrap items-center gap-2"
							>
								<span class="text-muted-foreground text-xs">Másolás évből:</span>
								<Select
									:model-value="selectedCopyYear(entry)"
									@update:model-value="setSelectedCopyYear(entry, String($event))"
								>
									<SelectTrigger class="h-8 w-36 bg-white">
										<SelectValue placeholder="Év" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem
											v-for="source in tooltipSources(entry)"
											:key="source.year"
											:value="source.year"
										>
											{{ source.year }}
										</SelectItem>
									</SelectContent>
								</Select>
								<Button
									:disabled="!selectedCopyYear(entry)"
									size="sm"
									type="button"
									variant="secondary"
									@click="copyTooltipFromYear(entry, selectedCopyYear(entry))"
								>
									Másolás
								</Button>
							</div>
							<div
								v-if="!entry.tooltip.trim()"
								class="mt-1 flex items-center gap-1 text-xs text-amber-700"
							>
								<AlertCircle class="size-3.5" />
								Hiányzó súgó
							</div>
						</div>
						<div>
							<button
								:aria-checked="kgrIds.has(entry.id)"
								:disabled="!kgrLimitEnabled"
								class="border-input bg-background data-[state=checked]:bg-primary relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border px-1 transition-colors"
								:class="!kgrLimitEnabled && 'cursor-not-allowed opacity-50'"
								:data-state="kgrIds.has(entry.id) ? 'checked' : 'unchecked'"
								role="switch"
								type="button"
								@click="setKgr(entry, !kgrIds.has(entry.id))"
							>
								<span
									class="bg-background pointer-events-none block size-6 rounded-full border shadow-sm transition-transform data-[state=checked]:translate-x-8"
									:data-state="kgrIds.has(entry.id) ? 'checked' : 'unchecked'"
								/>
							</button>
							<div
								v-if="hasMixedKgrSiblings(entry)"
								class="mt-2 flex items-start gap-1 text-xs text-amber-700"
							>
								<AlertCircle class="mt-0.5 size-3.5 shrink-0" />
								<span>Vegyes jelölés a szülő alatt.</span>
							</div>
						</div>
						<div class="space-y-1">
							<div class="flex items-center gap-1 text-xs">
								<CheckCircle2
									v-if="namesForEntry(entry).length <= 1"
									class="size-3.5 text-emerald-600"
								/>
								<AlertCircle
									v-else
									class="size-3.5 text-amber-700"
								/>
								{{ namesForEntry(entry).length }} név
							</div>
							<div class="text-muted-foreground space-y-1 text-xs">
								<div
									v-for="variant in namesForEntry(entry)"
									:key="variant.name"
								>
									<span class="font-medium text-foreground">{{ variant.name }}</span>
									<span> - {{ variant.years.join(', ') }}</span>
								</div>
							</div>
						</div>
					</div>
					<div
						v-if="!selectedEntries.length"
						class="text-muted-foreground border-t p-6 text-center text-sm"
					>
						Nincs találat a kiválasztott szűrőkkel.
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
