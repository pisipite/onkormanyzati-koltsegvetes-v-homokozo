<script setup lang="ts">
withDefaults(
	defineProps<{
		help?: string;
		inputType?: string;
		label: string;
		modelValue: string;
		placeholder?: string;
		textarea?: boolean;
	}>(),
	{
		help: undefined,
		inputType: 'text',
		placeholder: undefined,
		textarea: false,
	},
);

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void;
}>();
</script>

<template>
	<ConfigFieldRow
		:help="help"
		:label="label"
	>
		<Textarea
			v-if="textarea"
			:model-value="modelValue"
			:placeholder="placeholder"
			@update:model-value="emit('update:modelValue', String($event))"
		/>
		<Input
			v-else
			:model-value="modelValue"
			:placeholder="placeholder"
			:type="inputType"
			@update:model-value="emit('update:modelValue', String($event))"
		/>
	</ConfigFieldRow>
</template>
