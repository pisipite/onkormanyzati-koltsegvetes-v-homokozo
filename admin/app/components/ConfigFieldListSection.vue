<script setup lang="ts">
export type ConfigFieldDefinition = {
	help?: string;
	inputType?: string;
	key: string;
	label: string;
	placeholder?: string;
	textarea?: boolean;
};

defineProps<{
	fields: ConfigFieldDefinition[];
	title: string;
}>();

const { readConfigValue, writeConfigValue } = await useConfigData();

function getValue(key: string) {
	return readConfigValue(key);
}

function setValue(key: string, value: string) {
	writeConfigValue(key, value);
}
</script>

<template>
	<ConfigFormSection :title="title">
		<template #title>
			<slot name="title">
				{{ title }}
			</slot>
		</template>
		<ConfigTextField
			v-for="field in fields"
			:key="field.key"
			:help="field.help"
			:input-type="field.inputType"
			:label="field.label"
			:model-value="getValue(field.key)"
			:placeholder="field.placeholder"
			:textarea="field.textarea"
			@update:model-value="setValue(field.key, $event)"
		/>
	</ConfigFormSection>
</template>
