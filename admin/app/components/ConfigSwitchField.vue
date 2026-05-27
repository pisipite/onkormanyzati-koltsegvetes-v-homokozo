<script setup lang="ts">
defineProps<{
	help?: string;
	label: string;
	modelValue: boolean;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
	<ConfigFieldRow
		:help="help"
		:label="label"
	>
		<div class="flex items-center">
			<button
				:aria-checked="modelValue"
				class="border-input bg-background data-[state=checked]:bg-primary relative inline-flex h-8 w-16 items-center rounded-full border px-1 transition-colors"
				:data-state="modelValue ? 'checked' : 'unchecked'"
				role="switch"
				type="button"
				@click="emit('update:modelValue', !modelValue)"
			>
				<span
					class="bg-background pointer-events-none block size-6 rounded-full border shadow-sm transition-transform data-[state=checked]:translate-x-8"
					:data-state="modelValue ? 'checked' : 'unchecked'"
				/>
				<span class="sr-only">{{ label }}</span>
			</button>
			<span class="text-muted-foreground ml-3 text-sm">
				{{ modelValue ? 'Igen' : 'Nem' }}
			</span>
		</div>
	</ConfigFieldRow>
</template>
