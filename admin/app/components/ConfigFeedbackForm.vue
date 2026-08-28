<script setup lang="ts">
import type { ConfigFieldDefinition } from './ConfigFieldListSection.vue';

const fields: ConfigFieldDefinition[] = [
	{ key: 'feedback.title', label: 'Visszajelzés címsor', help: 'Visszajelzés ablak címsora.' },
	{
		key: 'feedback.text',
		label: 'Visszajelzés szövege',
		textarea: true,
		help: 'Visszajelzésre buzdító szöveg.',
	},
	{
		key: 'feedback.action',
		label: 'Visszajelzés gomb szövege',
		help: 'Visszajelző űrlapra mutató link szövege.',
	},
	{
		key: 'feedback.url',
		label: 'Visszajelzés url',
		inputType: 'url',
		help: 'Visszajelző űrlap URL-je.',
	},
];
</script>

<template>
	<ConfigFieldListSection
		:fields="fields"
		title="Visszajelzés"
	>
		<template #title>
			<span class="flex items-center gap-2">
				Visszajelzés
				<ConfigModuleStatusDot module-key="feedback" />
			</span>
		</template>
	</ConfigFieldListSection>
</template>
