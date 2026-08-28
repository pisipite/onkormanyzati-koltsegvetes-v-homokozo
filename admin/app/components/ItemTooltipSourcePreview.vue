<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { ChevronDown, ChevronUp } from 'lucide-vue-next';
import { cn } from '~/lib/utils';

const props = defineProps<{
	text: string;
}>();

const preview = useTemplateRef<HTMLElement>('preview');
const expanded = ref(false);
const overflowing = ref(false);

function measureOverflow() {
	if (!preview.value || expanded.value) return;
	overflowing.value = preview.value.scrollHeight > preview.value.clientHeight + 1;
}

watch(
	() => props.text,
	() => {
		expanded.value = false;
		nextTick(measureOverflow);
	},
);

onMounted(() => nextTick(measureOverflow));
useResizeObserver(preview, measureOverflow);
</script>

<template>
	<div>
		<p
			ref="preview"
			:class="
				cn(
					'text-muted-foreground text-xs whitespace-pre-wrap',
					!expanded && 'max-h-10 overflow-hidden',
				)
			"
		>
			{{ text }}
		</p>
		<Tooltip v-if="overflowing">
			<TooltipTrigger as-child>
				<Button
					:aria-expanded="expanded"
					:aria-label="expanded ? 'Súgószöveg összecsukása' : 'Teljes súgószöveg megnyitása'"
					class="mt-1 size-6"
					size="icon-sm"
					type="button"
					variant="ghost"
					@click="expanded = !expanded"
				>
					<ChevronUp v-if="expanded" class="size-4" />
					<ChevronDown v-else class="size-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{{ expanded ? 'Súgószöveg összecsukása' : 'Teljes súgószöveg megnyitása' }}
			</TooltipContent>
		</Tooltip>
	</div>
</template>
