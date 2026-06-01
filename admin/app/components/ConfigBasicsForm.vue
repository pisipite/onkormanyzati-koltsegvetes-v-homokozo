<script setup lang="ts">
const { addConfigValue, readConfigValue, writeConfigValue } = await useConfigData();
const { years } = await useBudgetData();

type TextField = {
	help?: string;
	inputType?: string;
	key: string;
	label: string;
	markdown?: boolean;
	textarea?: boolean;
};

const textFields: TextField[] = [
	{
		key: 'url',
		label: 'A weboldal leendő URL-je',
		inputType: 'url',
		help: 'Keresőoptimalizálásnál és megosztásnál van szerepe.',
	},
	{
		key: 'seo.siteName',
		label: 'Weboldal neve',
		help: 'Böngészőablak címsorának 2. része. A teljes címsor max. 60 karakter lehet.',
	},
	{
		key: 'seo.pageTitle',
		label: 'Weboldal neve',
		help: 'Böngészőablak címsorának 2. része. A teljes címsor max. 60 karakter lehet.',
	},
	{
		key: 'seo.ogTitle',
		label: 'Social megosztás címsora',
		help: 'Facebook/Twitter megosztáskor az előnézeti kártya címsora.',
	},
	{
		key: 'seo.description',
		label: 'Social megosztás leírása',
		textarea: true,
		help: 'Google találatban, ill. Facebook/Twitter megosztáskor az előnézeti kártyában megjelenő leírás. Max. 160 karakter.',
	},
	{
		key: 'social.text',
		label: 'Megosztás szövege',
		help: 'Megosztáskor a Twitter bejegyzés szövege, LinkedIn poszt vagy email tárgya.',
	},
	{
		key: 'navBar.bannerText',
		label: 'Banner szövege',
		markdown: true,
		textarea: true,
		help: 'Markdown jelölések használhatóak (pl. formázás, linkek).',
	},
	{
		key: 'city',
		label: 'Település neve',
		help: 'Felső navigációs sáv bal oldalán megjelenő városnév.',
	},
	{
		key: 'navBar.moreInfo',
		label: 'További infó megnevezése',
		help: 'További információ ablakot előhívó link szövege a felső navigációs sávban.',
	},
	{
		key: 'moreInfo.title',
		label: 'További infó címsor',
		help: 'További információ ablak címsora.',
	},
	{
		key: 'moreInfo.text',
		label: 'További infó szöveg',
		markdown: true,
		textarea: true,
		help: 'További információ ablak szövege. Markdown jelölések használhatóak (pl. formázás, linkek).',
	},
	{
		key: 'header.title',
		label: 'Főcím a fejlécben',
		help: 'Fejléc szakaszban megjelenő főcím.',
	},
	{
		key: 'header.headline',
		label: 'Headline a fejlécben',
		help: 'Fejléc szakaszban megjelenő headline.',
	},
	{
		key: 'header.button',
		label: 'Tovább gomb szövege',
		help: 'Fejléc szakaszban megjelenő Tovább gomb szövege.',
	},
	{
		key: 'footer.url',
		label: 'Kontakt weboldal',
		inputType: 'url',
		help: 'Kontakt weboldal címe.',
	},
	{
		key: 'footer.fb',
		label: 'Kontakt Facebook oldal',
		help: 'Kontakt Facebook oldal azonosítója.',
	},
	{
		key: 'footer.email',
		label: 'Kontakt email cím',
		inputType: 'email',
		help: 'Kontakt email cím.',
	},
	{
		key: 'iframe.title',
		label: 'Iframe oldal megnevezése',
		help: 'Iframe-es oldal elnevezése.',
	},
	{
		key: 'iframe.url',
		label: 'Iframe URL',
		inputType: 'url',
		help: 'Iframe-es oldalban beágyazott URL.',
	},
	{
		key: 'ga.id',
		label: 'Google Analytics azonosító',
		help: 'Google Analytics azonosító (UA-XXXXXXXXX-X).',
	},
	{
		key: 'gtm.id',
		label: 'Google Tag Manager azonosító',
		help: 'Google Tag Manager azonosító (GTM-XXXXXXX).',
	},
	{
		key: 'font.imports',
		label: 'Webfont importok',
		textarea: true,
		help: "Webfonto(ka)t importáló CSS kód, pl: `@import url('https://...');`, lehet több ilyen a cellában.",
	},
	{
		key: 'font.base',
		label: 'Alap betűtípus',
		help: 'Alap betűtípus neve, alapértelmezetthez (Roboto Condensed) hagyd üresen.',
	},
	{
		key: 'font.headings',
		label: 'Fejlécek betűtípusa',
		help: 'Fejlécek betűtípusának neve, font.base használatához hagyd üresen.',
	},
	{
		key: 'font.vis',
		label: 'Ábrák betűtípusa',
		help: 'Ábrák betűtípusának neve, font.base használatához hagyd üresen.',
	},
];

const availableYears = computed(() =>
	Object.keys(years.value || {}).sort((a, b) => b.localeCompare(a)),
);

const defaultYear = computed({
	get: () => readConfigValue('defaultYear'),
	set: (value) => writeConfigValue('defaultYear', value),
});

const showBanner = computed({
	get: () =>
		['1', 'true', 'igen'].includes(readConfigValue('navBar.showBanner').trim().toLowerCase()),
	set: (value) => writeConfigValue('navBar.showBanner', value ? '1' : '0'),
});

function getValue(key: string) {
	return readConfigValue(key);
}

function setValue(key: string, value: string) {
	writeConfigValue(key, value);
}

function setThemeValue(year: string, value: string) {
	const key = `theme.${year}`;
	if (!getValue(key)) {
		addConfigValue(key, value, '', 'theme.', 'font.vis');
		return;
	}
	setValue(key, value);
}
</script>

<template>
	<ConfigFormSection title="Alapadatok">
		<ConfigFieldRow
			help="A budget.xlsx fájlban szereplő évek közül választható ki."
			label="Alapértelmezett év"
		>
			<Select v-model="defaultYear">
				<SelectTrigger class="w-full">
					<SelectValue placeholder="Év kiválasztása" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem
						v-for="year in availableYears"
						:key="year"
						:value="year"
					>
						{{ year }}
					</SelectItem>
				</SelectContent>
			</Select>
		</ConfigFieldRow>
		<div class="bg-muted/20 border-b px-4 py-4">
			<div class="mb-3 flex flex-col gap-1">
				<h3 class="text-sm font-semibold">Évek színei</h3>
				<p class="text-muted-foreground text-sm">
					A költségvetésben szereplő évekhez tartozó témaszínek.
				</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<label
					v-for="year in availableYears"
					:key="year"
					class="bg-background grid gap-2 rounded-md border p-3"
				>
					<span class="text-sm font-medium">{{ year }}</span>
					<div class="flex items-center gap-2">
						<Input
							class="h-10 w-14 p-1"
							:model-value="getValue(`theme.${year}`) || '#000000'"
							type="color"
							@update:model-value="setThemeValue(year, String($event))"
						/>
						<Input
							:model-value="getValue(`theme.${year}`)"
							placeholder="#000000"
							@update:model-value="setThemeValue(year, String($event))"
						/>
					</div>
				</label>
			</div>
		</div>
		<ConfigTextField
			v-for="field in textFields.slice(0, 6)"
			:key="field.key"
			:help="field.help"
			:input-type="field.inputType"
			:label="field.label"
			:markdown="field.markdown"
			:model-value="getValue(field.key)"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>
		<ConfigSwitchField
			v-model="showBanner"
			help="Banner megjelenítése?"
			label="Banner megjelenítése"
		/>
		<ConfigTextField
			v-for="field in textFields.slice(6)"
			:key="field.key"
			:help="field.help"
			:input-type="field.inputType"
			:label="field.label"
			:markdown="field.markdown"
			:model-value="getValue(field.key)"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>
	</ConfigFormSection>
</template>
