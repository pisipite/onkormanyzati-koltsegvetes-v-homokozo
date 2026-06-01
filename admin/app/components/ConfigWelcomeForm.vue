<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';

const { addConfigValue, deleteConfigValue, listConfigKeys, readConfigValue, writeConfigValue } =
	await useConfigData();
const { years } = await useBudgetData();

type TextField = {
	help?: string;
	key: string;
	label: string;
	markdown?: boolean;
	textarea?: boolean;
};

const fieldsBeforeYearlyLeftBlocks: TextField[] = [
	{ key: 'welcome.title', label: 'Köszöntő címsor' },
	{
		key: 'welcome.leftBlock',
		label: 'Köszöntő bal hasáb',
		markdown: true,
		textarea: true,
		help: 'Köszöntő szakasz bal oldali hasábjának szövege. Markdown jelölések használhatóak (pl. formázás, linkek).',
	},
];

const fieldsBeforeYearlyNames: TextField[] = [
	{
		key: 'welcome.rightBlock',
		label: 'Köszöntő jobb hasáb',
		markdown: true,
		textarea: true,
		help: 'Köszöntő szakasz jobb oldali hasábjának szövege. Markdown jelölések használhatóak (pl. formázás, linkek).',
	},
	{
		key: 'welcome.aboveSignature',
		label: 'Üdv szöveg',
		help: 'Köszöntő szakasz aláírás feletti sorának szövege.',
	},
	{
		key: 'welcome.name',
		label: 'Aláíró neve',
		help: 'Köszöntő szakaszt aláíró személy neve.',
	},
];

const fieldsAfterYearlyNames: TextField[] = [
	{
		key: 'welcome.role',
		label: 'Aláíró tisztsége',
		help: 'Köszöntő szakaszt aláíró személy tisztsége.',
	},
];

const availableYears = computed(() =>
	Object.keys(years.value || {}).sort((a, b) => b.localeCompare(a)),
);

const leftBlockKeys = computed(() =>
	listConfigKeys('welcome.leftBlocks.').sort((a, b) => b.localeCompare(a)),
);
const nameKeys = computed(() =>
	listConfigKeys('welcome.names.').sort((a, b) => b.localeCompare(a)),
);

const leftBlockYearToAdd = ref('');
const nameYearToAdd = ref('');

const leftBlockAddableYears = computed(() =>
	availableYears.value.filter(
		(year) => !leftBlockKeys.value.includes(`welcome.leftBlocks.${year}`),
	),
);
const nameAddableYears = computed(() =>
	availableYears.value.filter((year) => !nameKeys.value.includes(`welcome.names.${year}`)),
);

watch(
	leftBlockAddableYears,
	(yearList) => {
		if (!yearList.includes(leftBlockYearToAdd.value))
			leftBlockYearToAdd.value = yearList[0] || '';
	},
	{ immediate: true },
);

watch(
	nameAddableYears,
	(yearList) => {
		if (!yearList.includes(nameYearToAdd.value)) nameYearToAdd.value = yearList[0] || '';
	},
	{ immediate: true },
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

function addLeftBlockYear() {
	if (!leftBlockYearToAdd.value) return;
	const year = leftBlockYearToAdd.value;
	addConfigValue(
		`welcome.leftBlocks.${year}`,
		'',
		`${year} Köszöntő szakasz bal oldali hasábjának szövege. Markdown jelölések használhatóak (pl. formázás, linkek).`,
		'welcome.leftBlocks.',
		'welcome.title',
	);
}

function addNameYear() {
	if (!nameYearToAdd.value) return;
	const year = nameYearToAdd.value;
	addConfigValue(
		`welcome.names.${year}`,
		'',
		`Köszöntő szakaszt aláíró személy neve ${year} évben.`,
		'welcome.names.',
		'welcome.name',
	);
}
</script>

<template>
	<ConfigFormSection title="Köszöntő szakasz">
		<ConfigTextField
			v-for="field in fieldsBeforeYearlyLeftBlocks"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:markdown="field.markdown"
			:model-value="getValue(field.key)"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>

		<div class="bg-muted/20 border-b px-4 py-4">
			<div class="mb-3 flex flex-col gap-1">
				<h3 class="text-sm font-semibold">Évhez kötött köszöntő bal hasábok</h3>
				<p class="text-muted-foreground text-sm">
					Ezek az értékek csak a kiválasztott évben írják felül az általános bal hasábot.
				</p>
			</div>
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-2 sm:flex-row">
					<Select
						v-model="leftBlockYearToAdd"
						:disabled="leftBlockAddableYears.length === 0"
					>
						<SelectTrigger class="bg-background w-full sm:max-w-56">
							<SelectValue placeholder="Év kiválasztása" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								v-for="year in leftBlockAddableYears"
								:key="year"
								:value="year"
							>
								{{ year }}
							</SelectItem>
						</SelectContent>
					</Select>
					<Button
						:disabled="!leftBlockYearToAdd"
						type="button"
						@click="addLeftBlockYear"
					>
						<Plus />
						Hozzáadás
					</Button>
				</div>

				<div class="flex flex-col gap-3">
					<div
						v-for="key in leftBlockKeys"
						:key="key"
						class="bg-background rounded-md border"
					>
						<div class="flex items-center justify-between gap-3 border-b px-3 py-2">
							<div class="flex items-center gap-2">
								<Label>{{ yearFromKey(key) }} év köszöntő bal hasáb</Label>
								<ConfigHelpButton
									:help="`${yearFromKey(key)} Köszöntő szakasz bal oldali hasábjának szövege. Markdown jelölések használhatóak (pl. formázás, linkek).`"
								/>
							</div>
							<Button
								size="sm"
								type="button"
								variant="destructive"
								@click="deleteConfigValue(key)"
							>
								<Trash2 />
								Törlés
							</Button>
						</div>
						<div class="p-3">
							<Textarea
								:model-value="getValue(key)"
								@update:model-value="setValue(key, String($event))"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		<ConfigTextField
			v-for="field in fieldsBeforeYearlyNames"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:markdown="field.markdown"
			:model-value="getValue(field.key)"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>

		<div class="bg-muted/20 border-b px-4 py-4">
			<div class="mb-3 flex flex-col gap-1">
				<h3 class="text-sm font-semibold">Évhez kötött aláíró nevek</h3>
				<p class="text-muted-foreground text-sm">
					Ezek az értékek csak a kiválasztott évben írják felül az általános aláíró nevet.
				</p>
			</div>
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-2 sm:flex-row">
					<Select
						v-model="nameYearToAdd"
						:disabled="nameAddableYears.length === 0"
					>
						<SelectTrigger class="bg-background w-full sm:max-w-56">
							<SelectValue placeholder="Év kiválasztása" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem
								v-for="year in nameAddableYears"
								:key="year"
								:value="year"
							>
								{{ year }}
							</SelectItem>
						</SelectContent>
					</Select>
					<Button
						:disabled="!nameYearToAdd"
						type="button"
						@click="addNameYear"
					>
						<Plus />
						Hozzáadás
					</Button>
				</div>

				<div class="flex flex-col gap-3">
					<div
						v-for="key in nameKeys"
						:key="key"
						class="bg-background rounded-md border"
					>
						<div class="flex items-center justify-between gap-3 border-b px-3 py-2">
							<div class="flex items-center gap-2">
								<Label>Aláíró neve ({{ yearFromKey(key) }})</Label>
								<ConfigHelpButton
									:help="`Köszöntő szakaszt aláíró személy neve ${yearFromKey(key)} évben.`"
								/>
							</div>
							<Button
								size="sm"
								type="button"
								variant="destructive"
								@click="deleteConfigValue(key)"
							>
								<Trash2 />
								Törlés
							</Button>
						</div>
						<div class="p-3">
							<Input
								:model-value="getValue(key)"
								@update:model-value="setValue(key, String($event))"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>

		<ConfigTextField
			v-for="field in fieldsAfterYearlyNames"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:markdown="field.markdown"
			:model-value="getValue(field.key)"
			@update:model-value="setValue(field.key, $event)"
		/>
	</ConfigFormSection>
</template>
