<script setup lang="ts">
import { ChevronDown, ChevronRight } from 'lucide-vue-next';

const { defaultOpen = false, title } = defineProps<{
	defaultOpen?: boolean;
	title: string;
}>();

const isOpen = ref(defaultOpen);
</script>

<template>
	<Collapsible v-model:open="isOpen">
		<div class="not-prose overflow-hidden rounded-md border">
			<CollapsibleTrigger as-child>
				<button
					class="bg-muted flex w-full items-center gap-2 px-4 py-3 text-left text-base font-semibold"
					type="button"
				>
					<ChevronDown
						v-if="isOpen"
						class="size-4"
					/>
					<ChevronRight
						v-else
						class="size-4"
					/>
					<slot name="title">
						{{ title }}
					</slot>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<slot />
			</CollapsibleContent>
		</div>
	</Collapsible>
</template>
