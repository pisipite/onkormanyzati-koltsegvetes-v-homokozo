<script setup lang="ts">
const { readConfigValue, writeConfigValue } = await useConfigData();

const fields = [
	{
		key: 'search.tooShort',
		label: 'Keresés túl rövid',
		help: 'Kereséskor megjelenő szöveg, ha túl rövid a keresőkifejezés.',
	},
	{
		key: 'search.noResults',
		label: 'Keresés nincs találat',
		help: 'Kereséskor megjelenő szöveg, ha nincs találat.',
	},
	{
		key: 'search.income',
		label: 'Keresés Bevételek',
		help: 'Keresési találatban megjelenő link szövege, mely a Bevételek szakaszra mutat.',
	},
	{
		key: 'search.expense',
		label: 'Keresés Kiadások',
		help: 'Keresési találatban megjelenő link szövege, mely a Kiadások szakaszra mutat.',
	},
	{
		key: 'search.milestones',
		label: 'Keresés Fejlesztések',
		help: 'Keresési találatban megjelenő link szövege, mely a Fejlesztések szakaszra mutat.',
	},
	{
		key: 'search.econ',
		label: 'Keresés Közgazdasági',
		help: 'Keresési találatban megjelenő szöveg, ha az adott találat egy közgazdasági kategória.',
	},
	{
		key: 'search.func',
		label: 'Keresés Funkcionális',
		help: 'Keresési találatban megjelenő szöveg, ha az adott találat egy funkcionális kategória.',
	},
	{
		key: 'search.milestone',
		label: 'Keresés Fejlesztés',
		help: 'Keresési találatban megjelenő szöveg, ha az adott találat egy fejlesztés.',
	},
];

function getValue(key: string) {
	return readConfigValue(key);
}

function setValue(key: string, value: string) {
	writeConfigValue(key, value);
}
</script>

<template>
	<ConfigFormSection title="Keresés">
		<ConfigTextField
			v-for="field in fields"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:model-value="getValue(field.key)"
			@update:model-value="setValue(field.key, $event)"
		/>
	</ConfigFormSection>
</template>
