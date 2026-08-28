<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next';

const { addConfigValue, listConfigKeys, readConfigValue, writeConfigValue } = await useConfigData();
const { years } = await useBudgetData();

const switchesBeforeInflation = [
	{
		key: 'timeseries.func',
		label: 'Funkcionális idősor megjelenítése',
		help: 'Idősor funkcionális oldal megjelenítése?',
	},
	{
		key: 'timeseries.econ',
		label: 'Közgazdasági idősor megjelenítése',
		help: 'Idősor közgazdasági oldal megjelenítése?',
	},
	{
		key: 'timeseries.kgrOnly',
		label: 'KGR rovatokra korlátozás',
		help: 'Közgazdasági idősor korlátozása a kgr lapon megadott rovatkódokra.',
	},
];

const textFields = [
	{
		key: 'timeseries.expense',
		label: 'Kiadások idősor címsor',
		help: 'Idősor kiadások szakasz címsora.',
	},
	{
		key: 'timeseries.expenseText',
		label: 'Kiadások idősor magyarázat',
		markdown: true,
		textarea: true,
		help: 'Idősor kiadások szakasz magyarázata.',
	},
	{
		key: 'timeseries.income',
		label: 'Bevételek idősor címsor',
		help: 'Idősor bevételek szakasz címsora.',
	},
	{
		key: 'timeseries.incomeText',
		label: 'Bevételek idősor magyarázat',
		markdown: true,
		textarea: true,
		help: 'Idősor bevételek szakasz magyarázata.',
	},
];

const inflationKeys = computed(() =>
	listConfigKeys('inflations.').sort((a, b) => yearFromKey(a).localeCompare(yearFromKey(b))),
);
const gdpKeys = computed(() =>
	listConfigKeys('gdps.').sort((a, b) => yearFromKey(a).localeCompare(yearFromKey(b))),
);

const newInflationYear = ref('');
const newGdpYear = ref('');

const availableYears = computed(() =>
	Object.keys(years.value || {}).sort((a, b) => a.localeCompare(b, 'hu', { numeric: true })),
);

const selectedTimeseriesYears = computed(() =>
	readConfigValue('timeseries.years')
		.split(',')
		.map((year) => year.trim())
		.filter(Boolean),
);

function yearFromKey(key: string) {
	return key.split('.').at(-1) || '';
}

function getValue(key: string) {
	return readConfigValue(key);
}

function setValue(key: string, value: string) {
	writeConfigValue(key, value);
}

function changeDecimalValue(key: string, direction: -1 | 1) {
	const value = getValue(key).trim().replace(',', '.');
	const parsed = Number(value || '0');
	if (Number.isNaN(parsed)) return;
	setValue(key, (Math.round((parsed + direction * 0.1) * 10) / 10).toFixed(1));
}

function isEnabled(key: string) {
	return ['1', 'true', 'igen'].includes(readConfigValue(key).trim().toLowerCase());
}

function setEnabled(key: string, value: boolean) {
	writeConfigValue(key, value ? '1' : '0');
}

function isTimeseriesYearSelected(year: string) {
	return selectedTimeseriesYears.value.includes(year);
}

function toggleTimeseriesYear(year: string) {
	const selected = new Set(selectedTimeseriesYears.value);
	if (selected.has(year)) {
		selected.delete(year);
	} else {
		selected.add(year);
	}
	const ordered = availableYears.value.filter((availableYear) => selected.has(availableYear));
	writeConfigValue('timeseries.years', ordered.join(','));
}

function nextYear(keys: string[]) {
	const years = keys
		.map((key) => Number(yearFromKey(key)))
		.filter((year) => Number.isFinite(year));
	const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
	return String(maxYear + 1);
}

function addInflationYear() {
	const year = newInflationYear.value.trim() || nextYear(inflationKeys.value);
	if (!/^\d{4}$/.test(year)) return;
	addConfigValue(
		`inflations.${year}`,
		'',
		'Idősor infláció adatok az infláció-szűrő funkcióhoz.',
		'inflations.',
		'timeseries.incomeText',
	);
	newInflationYear.value = '';
}

function addGdpYear() {
	const year = newGdpYear.value.trim() || nextYear(gdpKeys.value);
	if (!/^\d{4}$/.test(year)) return;
	addConfigValue(
		`gdps.${year}`,
		'',
		'Idősor GDP adatok a GDP arányos megjelenítéshez.',
		'gdps.',
		'inflations.2020',
	);
	newGdpYear.value = '';
}
</script>

<template>
	<ConfigFormSection title="Idősor">
		<template #title>
			<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span class="flex items-center gap-2">
					Bevételek idősor
					<ConfigModuleStatusDot module-key="timeseries-income" />
				</span>
				<span class="flex items-center gap-2">
					Kiadások idősor
					<ConfigModuleStatusDot module-key="timeseries-expense" />
				</span>
			</span>
		</template>
		<ConfigSwitchField
			v-for="field in switchesBeforeInflation"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:model-value="isEnabled(field.key)"
			@update:model-value="setEnabled(field.key, $event)"
		/>

		<ConfigSwitchField
			help="Idősor infláció-szűrő megjelenítése?"
			label="Infláció-szűrő megjelenítése"
			:model-value="isEnabled('timeseries.inflation')"
			@update:model-value="setEnabled('timeseries.inflation', $event)"
		/>

		<div
			v-if="isEnabled('timeseries.inflation')"
			class="bg-muted/20 border-b px-4 py-4"
		>
			<div class="mb-3 flex flex-col gap-1">
				<h3 class="text-sm font-semibold">Inflációs adatok</h3>
				<p class="text-muted-foreground text-sm">
					Az idősor infláció-szűrő funkciójához használt éves százalékos értékek.
				</p>
			</div>
			<div class="mb-3 flex flex-col gap-2 sm:flex-row">
				<Input
					v-model="newInflationYear"
					class="bg-background sm:max-w-40"
					inputmode="numeric"
					:placeholder="nextYear(inflationKeys)"
				/>
				<Button
					type="button"
					@click="addInflationYear"
				>
					<Plus />
					Új év
				</Button>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<label
					v-for="key in inflationKeys"
					:key="key"
					class="bg-background grid gap-1 rounded-md border p-3"
				>
					<span class="text-sm font-medium">{{ yearFromKey(key) }}</span>
					<div class="flex items-center">
						<Button
							class="rounded-r-none border-r-0"
							size="icon"
							type="button"
							variant="outline"
							@click="changeDecimalValue(key, -1)"
						>
							<Minus class="size-4" />
						</Button>
						<Input
							class="rounded-none text-center"
							inputmode="decimal"
							:model-value="getValue(key)"
							step="0.1"
							type="number"
							@update:model-value="setValue(key, String($event))"
						/>
						<Button
							class="rounded-l-none border-l-0"
							size="icon"
							type="button"
							variant="outline"
							@click="changeDecimalValue(key, 1)"
						>
							<Plus class="size-4" />
						</Button>
					</div>
				</label>
			</div>
		</div>

		<ConfigSwitchField
			help="Idősor GDP megjelenítése?"
			label="GDP megjelenítése"
			:model-value="isEnabled('timeseries.gdp')"
			@update:model-value="setEnabled('timeseries.gdp', $event)"
		/>

		<div
			v-if="isEnabled('timeseries.gdp')"
			class="bg-muted/20 border-b px-4 py-4"
		>
			<div class="mb-3 flex flex-col gap-1">
				<h3 class="text-sm font-semibold">GDP adatok</h3>
				<p class="text-muted-foreground text-sm">
					Az idősor GDP-arányos megjelenítéséhez használt éves értékek.
				</p>
			</div>
			<div class="mb-3 flex flex-col gap-2 sm:flex-row">
				<Input
					v-model="newGdpYear"
					class="bg-background sm:max-w-40"
					inputmode="numeric"
					:placeholder="nextYear(gdpKeys)"
				/>
				<Button
					type="button"
					@click="addGdpYear"
				>
					<Plus />
					Új év
				</Button>
			</div>
			<div class="flex max-w-xl flex-col gap-2">
				<label
					v-for="key in gdpKeys"
					:key="key"
					class="bg-background grid grid-cols-[4rem_minmax(16ch,1fr)] items-center gap-3 rounded-md border px-3 py-2"
				>
					<span class="text-sm font-medium">{{ yearFromKey(key) }}</span>
					<Input
						class="font-mono"
						inputmode="numeric"
						:model-value="getValue(key)"
						type="number"
						@update:model-value="setValue(key, String($event))"
					/>
				</label>
			</div>
		</div>

		<ConfigFieldRow
			help="Idősor szűrése a kiválasztott évekre. Ha nincs kiválasztott év, az idősor minden költségvetési évet használ."
			label="Idősor évei"
		>
			<div class="flex flex-wrap gap-2">
				<Button
					v-for="year in availableYears"
					:key="year"
					type="button"
					:variant="isTimeseriesYearSelected(year) ? 'default' : 'outline'"
					@click="toggleTimeseriesYear(year)"
				>
					{{ year }}
				</Button>
			</div>
		</ConfigFieldRow>

		<ConfigTextField
			v-for="field in textFields"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:markdown="field.markdown"
			:model-value="getValue(field.key)"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>
	</ConfigFormSection>
</template>
