<script setup lang="ts">
import type { ConfigFieldDefinition } from './ConfigFieldListSection.vue';

const { addConfigValue, readConfigValue, writeConfigValue } = await useConfigData();

const fields: ConfigFieldDefinition[] = [
	{ key: 'inex.title', label: 'Mérleg címsor', help: 'Mérleg szakasz címsora.' },
	{ key: 'inex.subtitle', label: 'Mérleg alcím', help: 'Mérleg ábra fejléce.' },
	{
		key: 'inex.expenseNodes',
		label: 'Kiadási oldali rovatok',
		help: 'Mérleg ábra kiadási oldalán szereplő hasábok azonosítói vesszővel elválasztva.',
	},
	{
		key: 'inex.incomeNodes',
		label: 'Bevételi oldali rovatok',
		help: 'Mérleg ábra bevételi oldalán szereplő hasábok azonosítói vesszővel elválasztva.',
	},
	{
		key: 'inex.text',
		label: 'Mérleg magyarázó szöveg',
		textarea: true,
		help: 'Mérleg szakasz ábra alatti szövege. Markdown jelölések használhatóak (pl. formázás, linkek).',
	},
];

const colorKeys = computed(() =>
	[
		...readConfigValue('inex.expenseNodes').split(','),
		...readConfigValue('inex.incomeNodes').split(','),
	]
		.map((key) => key.trim())
		.filter(Boolean)
		.filter((key, index, list) => list.indexOf(key) === index)
		.map((key) => `inex.${key}`),
);

function labelFromKey(key: string) {
	return key.replace('inex.', '');
}

function getValue(key: string) {
	return readConfigValue(key);
}

function setValue(key: string, value: string) {
	writeConfigValue(key, value);
}

function setColorValue(key: string, value: string) {
	if (!getValue(key)) {
		addConfigValue(key, value, '', 'inex.', 'inex.text');
		return;
	}
	setValue(key, value);
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

		<div class="bg-muted/20 px-4 py-4">
			<div class="mb-3 flex flex-col gap-1">
				<h3 class="text-sm font-semibold">Mérleg színek</h3>
				<p class="text-muted-foreground text-sm">
					A mérleg ábrában szereplő rovatok színei.
				</p>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<label
					v-for="key in colorKeys"
					:key="key"
					class="bg-background grid gap-2 rounded-md border p-3"
				>
					<span class="text-sm font-medium">{{ labelFromKey(key) }}</span>
					<div class="flex items-center gap-2">
						<Input
							class="h-10 w-14 p-1"
							:model-value="getValue(key) || '#000000'"
							type="color"
							@update:model-value="setColorValue(key, String($event))"
						/>
						<Input
							:model-value="getValue(key)"
							placeholder="#000000"
							@update:model-value="setColorValue(key, String($event))"
						/>
					</div>
				</label>
			</div>
		</div>
	</ConfigFormSection>
</template>
