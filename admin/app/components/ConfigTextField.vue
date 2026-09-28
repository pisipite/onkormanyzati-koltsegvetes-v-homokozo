<script setup lang="ts">
withDefaults(
	defineProps<{
		help?: string;
		inputType?: string;
		label: string;
		markdown?: boolean;
		modelValue: string;
		placeholder?: string;
		textarea?: boolean;
	}>(),
	{
		help: undefined,
		inputType: 'text',
		markdown: false,
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
		<div
			v-if="textarea"
		>
			<MarkdownTextarea
				v-if="markdown"
				:model-value="modelValue"
				:placeholder="placeholder"
				@update:model-value="emit('update:modelValue', $event)"
			/>
			<Textarea
				v-else
				:model-value="modelValue"
				:placeholder="placeholder"
				@update:model-value="emit('update:modelValue', String($event))"
			/>
		</div>
		<Input
			v-else
			:model-value="modelValue"
			:placeholder="placeholder"
			:type="inputType"
			@update:model-value="emit('update:modelValue', String($event))"
		/>
	</ConfigFieldRow>
</template>
