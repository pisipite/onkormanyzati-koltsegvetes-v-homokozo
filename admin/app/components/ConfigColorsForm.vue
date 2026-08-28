<script setup lang="ts">
import { Plus } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const {
	addConfigValue,
	listConfigKeys,
	readConfigValue,
	writeConfigValue,
} = await useConfigData();
const { years } = await useBudgetData();

type EconomicKind = 'expense' | 'income';

type ColorCodeRow = {
	balanceCode: string;
	balanceColor: string;
	economicCode: string;
	economicColor: string;
	id: string;
};

type NewCodeDraft = {
	balanceCode: string;
	color: string;
	economicCode: string;
};

const functionalLabels: Record<string, string> = {
	1: 'Általános közszolgáltatások',
	2: 'Védelem',
	3: 'Közrend és közbiztonság',
	4: 'Gazdasági ügyek',
	5: 'Környezetvédelem',
	6: 'Lakásépítés és kommunális létesítmények',
	7: 'Egészségügy',
	8: 'Szabadidő, sport, kultúra, vallás',
	9: 'Oktatás',
	10: 'Szociális védelem',
	90: 'Technikai funkciókódok',
};

const codeSettings = {
	expense: {
		balanceListKey: 'inex.expenseNodes',
		codePattern: /^K\d+$/,
		codePatternHelp: 'A kiadási kód K előtaggal és számjegyekkel adható meg.',
		description: 'Kiadási kódok',
		example: 'K10',
		pairingListKey: 'inex.expenseColorCodes',
	},
	income: {
		balanceListKey: 'inex.incomeNodes',
		codePattern: /^(?:B|FT)\d+$/,
		codePatternHelp: 'A bevételi kód B vagy FT előtaggal és számjegyekkel adható meg.',
		description: 'Bevételi kódok',
		example: 'B9',
		pairingListKey: 'inex.incomeColorCodes',
	},
} as const;

const newCodeDrafts = reactive<Record<EconomicKind, NewCodeDraft>>({
	expense: { balanceCode: '', color: '#000000', economicCode: '' },
	income: { balanceCode: '', color: '#000000', economicCode: '' },
});

const availableYears = computed(() =>
	Object.keys(years.value || {}).sort((a, b) => b.localeCompare(a, 'hu', { numeric: true })),
);

const colorKeys = computed(() => listConfigKeys('color.'));

const functionalColorKeys = computed(() =>
	colorKeys.value
		.filter((key) => /^\d+$/.test(codeFromKey(key)))
		.sort((a, b) =>
			codeFromKey(a).localeCompare(codeFromKey(b), 'hu', { numeric: true }),
		),
);

const expenseRows = computed(() => buildCodeRows('expense'));
const incomeRows = computed(() => buildCodeRows('income'));

function codeFromKey(key: string) {
	return key.split('.').at(-1) || '';
}

function normalizeCode(value: string) {
	return value.trim().toUpperCase();
}

function valueFor(key: string) {
	return readConfigValue(key);
}

function configKeyExists(key: string) {
	const prefix = `${key.split('.')[0]}.`;
	return listConfigKeys(prefix).includes(key);
}

function balanceCodes(kind: EconomicKind) {
	return readConfigValue(codeSettings[kind].balanceListKey)
		.split(',')
		.map(normalizeCode)
		.filter(Boolean)
		.filter((code, index, list) => list.indexOf(code) === index);
}

function economicCodes(kind: EconomicKind) {
	return colorKeys.value
		.map(codeFromKey)
		.map(normalizeCode)
		.filter((code) => codeSettings[kind].codePattern.test(code));
}

function pairedEconomicCodes(kind: EconomicKind) {
	const balances = balanceCodes(kind);
	const economics = economicCodes(kind);
	const pairingKey = codeSettings[kind].pairingListKey;
	const configuredPairings = readConfigValue(pairingKey);
	if (configuredPairings.trim()) {
		const configuredCodes = configuredPairings
			.split(',')
			.map(normalizeCode);
		return balances.map((_code, index) => configuredCodes[index] || '');
	}
	return balances.map((code) => (economics.includes(code) ? code : ''));
}

function buildCodeRows(kind: EconomicKind): ColorCodeRow[] {
	const allEconomicCodes = economicCodes(kind);
	const remainingEconomicCodes = [...allEconomicCodes];
	const pairings = pairedEconomicCodes(kind);
	const rows = balanceCodes(kind).map((balanceCode, index) => {
		const pairedCode = pairings[index] || '';
		const economicCode = allEconomicCodes.includes(pairedCode) ? pairedCode : '';
		const pairedIndex = remainingEconomicCodes.indexOf(economicCode);
		if (pairedIndex >= 0) remainingEconomicCodes.splice(pairedIndex, 1);
		return { balanceCode, economicCode };
	});

	for (const economicCode of remainingEconomicCodes) {
		rows.push({ balanceCode: '', economicCode });
	}

	return rows.map(({ balanceCode, economicCode }, index) => ({
		balanceCode,
		balanceColor: balanceCode ? valueFor(`inex.${balanceCode}`) : '',
		economicCode,
		economicColor: economicCode ? valueFor(`color.${economicCode}`) : '',
		id: `${kind}:${balanceCode || '_'}:${economicCode || '_'}:${index}`,
	}));
}

function setOrAddValue(
	key: string,
	value: string,
	afterPrefix: string,
	fallbackKey: string,
	help: string,
) {
	if (writeConfigValue(key, value)) return;
	addConfigValue(key, value, help, afterPrefix, fallbackKey);
}

function setYearColor(year: string, value: string) {
	setOrAddValue(
		`theme.${year}`,
		value,
		'theme.',
		'font.vis',
		`CSS szín ehhez az évhez: ${year}`,
	);
}

function setBalanceColor(code: string, value: string) {
	if (!code) return;
	setOrAddValue(
		`inex.${code}`,
		value,
		'inex.',
		'inex.text',
		`CSS szín a Mérleg ábrán ehhez: ${code}`,
	);
}

function setEconomicColor(code: string, value: string) {
	if (!code) return;
	setOrAddValue(
		`color.${code}`,
		value,
		'color.',
		'inex.text',
		`CSS szín a Bevétel/Kiadás ábrán ehhez: ${code}`,
	);
}

function functionalLabel(key: string) {
	const code = codeFromKey(key);
	return [code, functionalLabels[code]].filter(Boolean).join(' - ');
}

function validateCode(kind: EconomicKind, code: string) {
	if (codeSettings[kind].codePattern.test(code)) return true;
	toast.error(codeSettings[kind].codePatternHelp);
	return false;
}

function writeBalanceCodeList(kind: EconomicKind, codes: string[]) {
	writeConfigValue(codeSettings[kind].balanceListKey, codes.join(','));
}

function writePairedEconomicCodes(kind: EconomicKind, codes: string[]) {
	setOrAddValue(
		codeSettings[kind].pairingListKey,
		codes.join(','),
		'inex.',
		'inex.text',
		`A ${codeSettings[kind].description.toLowerCase()} mérleg- és közgazdasági kódpárjai.`,
	);
}

function canAddCodePair(kind: EconomicKind) {
	const draft = newCodeDrafts[kind];
	return Boolean(draft.balanceCode.trim() || draft.economicCode.trim());
}

function addCodePair(kind: EconomicKind) {
	const draft = newCodeDrafts[kind];
	const balanceCode = normalizeCode(draft.balanceCode);
	const economicCode = normalizeCode(draft.economicCode);
	if (!balanceCode && !economicCode) return;
	if (balanceCode && !validateCode(kind, balanceCode)) return;
	if (economicCode && !validateCode(kind, economicCode)) return;

	const existingBalanceCodes = balanceCodes(kind);
	const existingPairings = pairedEconomicCodes(kind);
	if (balanceCode && existingBalanceCodes.includes(balanceCode)) {
		toast.error(`A mérlegben már szerepel a következő kód: ${balanceCode}`);
		return;
	}
	if (economicCode && configKeyExists(`color.${economicCode}`)) {
		toast.error(`A közgazdasági kódok között már szerepel: ${economicCode}`);
		return;
	}

	if (balanceCode) {
		writeBalanceCodeList(kind, [...existingBalanceCodes, balanceCode]);
		writePairedEconomicCodes(kind, [...existingPairings, economicCode]);
		setBalanceColor(balanceCode, draft.color);
	}
	if (economicCode) setEconomicColor(economicCode, draft.color);

	draft.balanceCode = '';
	draft.economicCode = '';
	draft.color = '#000000';
}
</script>

<template>
	<ConfigFormSection title="Színek">
		<div class="bg-muted/20 border-b px-4 py-4">
			<div class="mb-3">
				<h3 class="text-sm font-semibold">Évek színei</h3>
				<p class="text-muted-foreground text-sm">
					A költségvetésben szereplő évekhez tartozó témaszínek.
				</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<ConfigColorInput
					v-for="year in availableYears"
					:key="year"
					:label="year"
					:model-value="valueFor(`theme.${year}`)"
					@update:model-value="setYearColor(year, $event)"
				/>
			</div>
		</div>

		<div class="bg-muted/20 border-b px-4 py-4">
			<div class="mb-3">
				<h3 class="text-sm font-semibold">Funkciókódok színei</h3>
				<p class="text-muted-foreground text-sm">A funkcionális költségvetési nézet színei.</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<ConfigColorInput
					v-for="key in functionalColorKeys"
					:key="key"
					:label="functionalLabel(key)"
					:model-value="valueFor(key)"
					@update:model-value="writeConfigValue(key, $event)"
				/>
			</div>
		</div>

		<div class="bg-muted/20 px-4 py-4">
			<div class="mb-4">
				<h3 class="text-sm font-semibold">Mérleg és közgazdasági kódok színei</h3>
				<p class="text-muted-foreground text-sm">
					Azonos kódnál közös szín használható, az eltérő mérleg- és közgazdasági
					beállítás külön is megadható.
				</p>
			</div>

			<section
				v-for="kind in (['expense', 'income'] as const)"
				:key="kind"
				class="border-t py-3 first:border-t-0 first:pt-0 last:pb-0"
			>
				<h4 class="text-sm font-semibold">{{ codeSettings[kind].description }}</h4>
				<div class="bg-background mt-2 border-y">
					<div class="text-muted-foreground hidden grid-cols-[7rem_8rem_minmax(0,1fr)_6rem] gap-3 bg-gray-50 px-3 py-2 text-xs font-medium lg:grid">
						<span>Mérlegkód</span>
						<span>Közgazdasági kód</span>
						<span>Szín</span>
						<span class="text-right">Eltérő</span>
					</div>
					<ConfigEconomicColorRow
						v-for="row in kind === 'expense' ? expenseRows : incomeRows"
						:key="row.id"
						:balance-code="row.balanceCode"
						:balance-color="row.balanceColor"
						:economic-code="row.economicCode"
						:economic-color="row.economicColor"
						@update-balance-color="setBalanceColor(row.balanceCode, $event)"
						@update-economic-color="setEconomicColor(row.economicCode, $event)"
					/>

					<form
						class="border-t px-3 py-3"
						@submit.prevent="addCodePair(kind)"
					>
						<div class="mb-2 text-xs font-medium">Új kódpár</div>
						<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-[7rem_8rem_minmax(15rem,1fr)_auto] xl:items-center">
							<label class="grid gap-1">
								<span class="text-muted-foreground text-xs xl:sr-only">Mérlegkód</span>
								<Input
									v-model="newCodeDrafts[kind].balanceCode"
									class="h-8 font-mono text-xs"
									:placeholder="`pl. ${codeSettings[kind].example}`"
								/>
							</label>
							<label class="grid gap-1">
								<span class="text-muted-foreground text-xs xl:sr-only">Közgazdasági kód</span>
								<Input
									v-model="newCodeDrafts[kind].economicCode"
									class="h-8 font-mono text-xs"
									:placeholder="`pl. ${codeSettings[kind].example}`"
								/>
							</label>
							<ConfigInlineColorInput
								label="Közös szín"
								:model-value="newCodeDrafts[kind].color"
								@update:model-value="newCodeDrafts[kind].color = $event"
							/>
							<Button
								:disabled="!canAddCodePair(kind)"
								type="submit"
							>
								<Plus />
								Hozzáadás
							</Button>
						</div>
					</form>
				</div>
			</section>
		</div>
	</ConfigFormSection>
</template>
