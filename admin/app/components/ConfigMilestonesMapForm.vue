<script setup lang="ts">
import type { ConfigFieldDefinition } from './ConfigFieldListSection.vue';

const fields: ConfigFieldDefinition[] = [
	{
		key: 'milestones.title',
		label: 'Fejlesztések címsor',
		help: 'Fejlesztések szakasz címsora.',
	},
	{ key: 'map.title', label: 'Térkép címsor', help: 'Térkép szakasz címsora.' },
];
</script>

<template>
	<ConfigFieldListSection
		:fields="fields"
		title="Fejlesztések és Térkép"
	>
		<template #title>
			<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
				<span class="flex items-center gap-2">
					Fejlesztések
					<ConfigModuleStatusDot module-key="milestones" />
				</span>
				<span class="text-muted-foreground">és</span>
				<span class="flex items-center gap-2">
					Térkép
					<ConfigModuleStatusDot module-key="map" />
				</span>
			</span>
		</template>
	</ConfigFieldListSection>
</template>
