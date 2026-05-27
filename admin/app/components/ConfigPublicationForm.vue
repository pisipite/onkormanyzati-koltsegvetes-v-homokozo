<script setup lang="ts">
import type { ConfigFieldDefinition } from './ConfigFieldListSection.vue';

const fields: ConfigFieldDefinition[] = [
	{
		key: 'pub.lead',
		label: 'Kiadvány szövege',
		textarea: true,
		help: 'Kiadvány szakasz szövege',
	},
	{
		key: 'pub.url',
		label: 'Kiadvány url',
		inputType: 'url',
		help: 'Kiadvány szakasz gombja erre az URL-re linkel.',
	},
];
</script>

<template>
	<ConfigFieldListSection
		:fields="fields"
		title="Kiadvány"
	>
		<template #title>
			<span class="flex items-center gap-2">
				Kiadvány
				<ConfigModuleStatusDot module-key="pub" />
			</span>
		</template>
	</ConfigFieldListSection>
</template>
