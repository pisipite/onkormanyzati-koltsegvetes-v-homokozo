<script setup lang="ts">
type PickerOption = {
	group?: string;
	label?: string;
	value: string;
};

const props = withDefaults(
	defineProps<{
		allowCustom?: boolean;
		emptyText?: string;
		label: string;
		modelValue: string[];
		options: PickerOption[];
		placeholder?: string;
	}>(),
	{
		allowCustom: false,
		emptyText: 'Nincs találat.',
		placeholder: '',
	},
);

const emit = defineEmits<{
	(e: 'update:modelValue', value: string[]): void;
}>();

const root = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const query = ref('');

const selectedValues = computed(
	() => new Set(props.modelValue.map((value) => value.toLowerCase())),
);
const optionByValue = computed(
	() => new Map(props.options.map((option) => [option.value.toLowerCase(), option])),
);

const filteredOptions = computed(() => {
	const normalizedQuery = query.value.trim().toLowerCase();
	return props.options
		.filter((option) => !selectedValues.value.has(option.value.toLowerCase()))
		.filter((option) => {
			if (!normalizedQuery) return true;
			return `${option.value} ${option.label || ''} ${option.group || ''}`
				.toLowerCase()
				.includes(normalizedQuery);
		})
		.slice(0, 80);
});

function getOption(value: string) {
	return optionByValue.value.get(value.toLowerCase());
}

function displayLabel(value: string) {
	return getOption(value)?.label || value;
}

function labelWithoutValue(option: PickerOption) {
	const label = option.label || option.value;
	return label.startsWith(`${option.value} - `) ? label.slice(option.value.length + 3) : label;
}

function addValue(value: string) {
	const cleanValue = value.trim();
	if (!cleanValue) return;
	const option = getOption(cleanValue);
	if (!props.allowCustom && !option) return;
	const alreadySelected = props.modelValue.some(
		(selectedValue) => selectedValue.toLowerCase() === cleanValue.toLowerCase(),
	);
	if (!alreadySelected) {
		emit('update:modelValue', [...props.modelValue, option?.value || cleanValue]);
	}
	query.value = '';
	isOpen.value = true;
}

function removeValue(value: string) {
	emit(
		'update:modelValue',
		props.modelValue.filter((selectedValue) => selectedValue !== value),
	);
}

function addFromQuery() {
	const cleanQuery = query.value.trim();
	if (!cleanQuery) return;
	const exactMatch = getOption(cleanQuery);
	if (exactMatch) {
		addValue(exactMatch.value);
		return;
	}
	if (props.allowCustom) {
		addValue(cleanQuery);
		return;
	}
	if (filteredOptions.value[0]) addValue(filteredOptions.value[0].value);
}

function closeOnOutsideClick(event: PointerEvent) {
	if (!root.value || !(event.target instanceof Node)) return;
	if (root.value.contains(event.target)) return;
	isOpen.value = false;
}

onMounted(() => {
	document.addEventListener('pointerdown', closeOnOutsideClick);
});

onBeforeUnmount(() => {
	document.removeEventListener('pointerdown', closeOnOutsideClick);
});
</script>

<template>
	<div
		ref="root"
		class="relative grid min-w-0 gap-1"
	>
		<span class="text-sm font-medium">{{ label }}</span>
		<div
			class="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 min-h-9 rounded-md border px-2 py-1 shadow-xs focus-within:ring-[3px]"
		>
			<div class="flex flex-wrap gap-1">
				<span
					v-for="value in modelValue"
					:key="value"
					class="bg-muted inline-flex max-w-full items-center gap-1 rounded px-2 py-1 text-xs"
				>
					<span
						v-if="getOption(value)?.label"
						class="font-mono font-semibold"
					>
						{{ value }}
					</span>
					<span class="truncate">
						{{ displayLabel(value).replace(`${value} - `, '') }}
					</span>
					<button
						class="text-muted-foreground hover:text-foreground"
						type="button"
						@click="removeValue(value)"
					>
						×
					</button>
				</span>
				<input
					v-model="query"
					class="placeholder:text-muted-foreground min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
					:placeholder="placeholder"
					type="text"
					@focus="isOpen = true"
					@keydown.enter.prevent="addFromQuery"
				>
			</div>
		</div>
		<div
			v-if="isOpen"
			class="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-1 max-h-56 overflow-auto rounded-md border p-1 shadow-md"
		>
			<button
				v-for="option in filteredOptions"
				:key="option.value"
				class="hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
				type="button"
				@mousedown.prevent="addValue(option.value)"
			>
				<span
					v-if="option.label"
					class="min-w-16 font-mono font-semibold"
				>
					{{ option.value }}
				</span>
				<span class="min-w-0">
					<span class="block truncate">
						{{ labelWithoutValue(option) }}
					</span>
					<span
						v-if="option.group"
						class="text-muted-foreground block truncate text-xs"
					>
						{{ option.group }}
					</span>
				</span>
			</button>
			<div
				v-if="!filteredOptions.length"
				class="text-muted-foreground px-2 py-2 text-sm"
			>
				{{ emptyText }}
			</div>
		</div>
	</div>
</template>
