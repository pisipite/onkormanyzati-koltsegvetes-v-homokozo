<script setup lang="ts">
import type { ConfigFieldDefinition } from './ConfigFieldListSection.vue';

const { readConfigValue, writeConfigValue } = await useConfigData();

const fields: ConfigFieldDefinition[] = [
	{ key: 'inex.title', label: 'Mérleg címsor', help: 'Mérleg szakasz címsora.' },
	{ key: 'inex.subtitle', label: 'Mérleg alcím', help: 'Mérleg ábra fejléce.' },
	{
		key: 'inex.text',
		label: 'Mérleg magyarázó szöveg',
		textarea: true,
		help: 'Mérleg szakasz ábra alatti szövege. Markdown jelölések használhatóak (pl. formázás, linkek).',
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
	<ConfigFormSection title="Mérleg">
		<template #title>
			<span class="flex items-center gap-2">
				Mérleg
				<ConfigModuleStatusDot module-key="inex" />
			</span>
		</template>
		<ConfigTextField
			v-for="field in fields"
			:key="field.key"
			:help="field.help"
			:label="field.label"
			:model-value="getValue(field.key)"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>
	</ConfigFormSection>
</template>
