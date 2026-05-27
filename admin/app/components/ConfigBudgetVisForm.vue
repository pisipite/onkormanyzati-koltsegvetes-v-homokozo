<script setup lang="ts">
import type { ConfigFieldDefinition } from './ConfigFieldListSection.vue';

const fields: ConfigFieldDefinition[] = [
	{ key: 'vis.income', label: 'Bevételek címsor', help: 'Bevételek szakasz címsora.' },
	{
		key: 'vis.incomeText',
		label: 'Bevételek magyarázó szöveg',
		textarea: true,
		help: 'Bevétel ábra alatti szöveg (opcionális).',
	},
	{ key: 'vis.expense', label: 'Kiadások címsor', help: 'Kiadások szakasz címsora.' },
	{
		key: 'vis.expenseText',
		label: 'Kiadások magyarázó szöveg',
		textarea: true,
		help: 'Kiadás ábra alatti szöveg (opcionális).',
	},
	{
		key: 'vis.econ',
		label: 'Közgazdasági nézet gomb',
		help: 'Közgazdasági nézetre váltó gomb szövege.',
	},
	{
		key: 'vis.econHint',
		label: 'Közgazdasági nézet súgó',
		help: 'Közgazdasági nézetre váltó gomb magyarázata (tooltip).',
	},
	{
		key: 'vis.func',
		label: 'Funkcionális nézet gomb',
		help: 'Funkcionális nézetre váltó gomb szövege.',
	},
	{
		key: 'vis.funcHint',
		label: 'Funkcionális nézet súgó',
		help: 'Funkcionális nézetre váltó gomb magyarázata (tooltip).',
	},
];
</script>

<template>
	<ConfigFieldListSection
		:fields="fields"
		title="Költségvetés"
	/>
</template>
