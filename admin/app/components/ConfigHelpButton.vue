<script setup lang="ts">
import { CircleHelp } from 'lucide-vue-next';

defineProps<{
	help?: string;
}>();
</script>

<template>
	<TooltipProvider v-if="help">
		<Tooltip>
			<TooltipTrigger as-child>
				<Button
					aria-label="Súgó"
					class="size-7 rounded-full"
					size="icon"
					type="button"
					variant="ghost"
				>
					<CircleHelp class="size-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent class="max-w-64">
				<p>{{ help }}</p>
			</TooltipContent>
		</Tooltip>
	</TooltipProvider>
</template>
