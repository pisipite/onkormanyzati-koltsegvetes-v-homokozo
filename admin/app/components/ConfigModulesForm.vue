<script setup lang="ts">
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-vue-next';

const { readConfigValue, writeConfigValue } = await useConfigData();

type BooleanField = {
	help?: string;
	key: string;
	label: string;
	moduleKey?: string;
};

const summaryFields: BooleanField[] = [
	{
		key: 'modules.timeseries-income',
		label: 'Bevétel idősor',
		moduleKey: 'timeseries-income',
	},
	{
		key: 'modules.timeseries-expense',
		label: 'Kiadás idősor',
		moduleKey: 'timeseries-expense',
	},
	{ key: 'modules.map', label: 'Térkép', moduleKey: 'map' },
	{
		key: 'modules.feedback',
		label: 'Visszajelzés szakasz/gomb',
		moduleKey: 'feedback',
	},
];

const yearlyFields: BooleanField[] = [
	{
		key: 'modules.inex',
		label: 'Mérleg',
		moduleKey: 'inex',
	},
	{
		key: 'modules.income',
		label: 'Bevételek',
		help: 'Automatikusan ki lesz kapcsolva, ha nincs bevételi adat.',
		moduleKey: 'income',
	},
	{
		key: 'modules.milestones',
		label: 'Fejlesztéskártyák',
		moduleKey: 'milestones',
	},
	{ key: 'modules.pub', label: 'Kiadványos szakasz', moduleKey: 'pub' },
	{ key: 'modules.social', label: 'Megosztás gombok' },
];

const moduleOrderLabels: Record<string, string> = {
	pub: 'Kiadvány',
	inex: 'Mérleg',
	income: 'Bevételek',
	expense: 'Kiadások',
	'timeseries-income': 'Bevételek idősor',
	'timeseries-expense': 'Kiadások idősor',
	milestones: 'Fejlesztéskártyák',
	map: 'Térkép',
	feedback: 'Visszajelzés',
};

const summaryModules = new Set(summaryFields.map((field) => field.moduleKey).filter(Boolean));
const yearlyModules = new Set([
	...yearlyFields.map((field) => field.moduleKey).filter(Boolean),
	'expense',
]);
const defaultModuleOrder = Object.keys(moduleOrderLabels);
const draggedModuleKey = ref<string | null>(null);

const moduleOrder = computed(() => {
	const stored = readConfigValue('modules.order')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
	const storedSet = new Set(stored);
	return [
		...stored.filter((item) => item in moduleOrderLabels),
		...defaultModuleOrder.filter((item) => !storedSet.has(item)),
	];
});

function isEnabled(key: string) {
	return ['1', 'true', 'igen'].includes(readConfigValue(key).trim().toLowerCase());
}

function setEnabled(key: string, value: boolean) {
	writeConfigValue(key, value ? '1' : '0');
}

function isModuleEnabled(moduleKey: string) {
	if (moduleKey === 'expense') return true;
	return isEnabled(`modules.${moduleKey}`);
}

function moveModule(index: number, direction: -1 | 1) {
	const next = [...moduleOrder.value];
	const target = index + direction;
	if (target < 0 || target >= next.length) return;
	[next[index], next[target]] = [next[target]!, next[index]!];
	writeConfigValue('modules.order', next.join(','));
}

function moveDraggedModule(targetIndex: number) {
	if (!draggedModuleKey.value) return;
	const next = [...moduleOrder.value];
	const sourceIndex = next.indexOf(draggedModuleKey.value);
	if (sourceIndex < 0 || sourceIndex === targetIndex) return;
	const [moved] = next.splice(sourceIndex, 1);
	next.splice(targetIndex, 0, moved!);
	writeConfigValue('modules.order', next.join(','));
}

function handleDragStart(event: DragEvent, moduleKey: string) {
	draggedModuleKey.value = moduleKey;
	event.dataTransfer?.setData('text/plain', moduleKey);
	if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function moduleOrderClass(moduleKey: string) {
	if (summaryModules.has(moduleKey)) {
		return 'border-sky-200 bg-sky-50 text-sky-950';
	}
	if (yearlyModules.has(moduleKey)) {
		return 'border-emerald-200 bg-emerald-50 text-emerald-950';
	}
	return 'border-slate-200 bg-slate-50 text-slate-950';
}
</script>

<template>
	<ConfigFormSection title="Modulok">
		<div class="border-t p-4">
			<div class="grid gap-4 lg:grid-cols-2">
				<div class="rounded-md border border-sky-200 bg-sky-50/60">
					<div class="border-b border-sky-200 px-3 py-2 text-sm font-semibold">
						Összesítés
					</div>
					<div class="divide-y divide-sky-100">
						<div
							v-for="field in summaryFields"
							:key="field.key"
							class="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 px-3 py-3"
						>
							<div class="flex min-w-0 items-center gap-2">
								<Label class="leading-snug">{{ field.label }}</Label>
								<ConfigHelpButton :help="field.help" />
							</div>
							<div class="flex items-center justify-end gap-2">
								<button
									:aria-checked="isEnabled(field.key)"
									class="border-input bg-background data-[state=checked]:bg-primary relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border px-1 transition-colors"
									:data-state="isEnabled(field.key) ? 'checked' : 'unchecked'"
									role="switch"
									type="button"
									@click="setEnabled(field.key, !isEnabled(field.key))"
								>
									<span
										class="bg-background pointer-events-none block size-6 rounded-full border shadow-sm transition-transform data-[state=checked]:translate-x-8"
										:data-state="isEnabled(field.key) ? 'checked' : 'unchecked'"
									/>
									<span class="sr-only">{{ field.label }}</span>
								</button>
								<span class="text-muted-foreground w-8 text-sm">
									{{ isEnabled(field.key) ? 'Igen' : 'Nem' }}
								</span>
							</div>
						</div>
					</div>
				</div>
				<div class="rounded-md border border-emerald-200 bg-emerald-50/60">
					<div class="border-b border-emerald-200 px-3 py-2 text-sm font-semibold">
						Éves áttekintés
					</div>
					<div class="divide-y divide-emerald-100">
						<div
							v-for="field in yearlyFields"
							:key="field.key"
							class="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-3 px-3 py-3"
						>
							<div class="flex min-w-0 items-center gap-2">
								<Label class="leading-snug">{{ field.label }}</Label>
								<ConfigHelpButton :help="field.help" />
							</div>
							<div class="flex items-center justify-end gap-2">
								<button
									:aria-checked="isEnabled(field.key)"
									class="border-input bg-background data-[state=checked]:bg-primary relative inline-flex h-8 w-16 shrink-0 items-center rounded-full border px-1 transition-colors"
									:data-state="isEnabled(field.key) ? 'checked' : 'unchecked'"
									role="switch"
									type="button"
									@click="setEnabled(field.key, !isEnabled(field.key))"
								>
									<span
										class="bg-background pointer-events-none block size-6 rounded-full border shadow-sm transition-transform data-[state=checked]:translate-x-8"
										:data-state="isEnabled(field.key) ? 'checked' : 'unchecked'"
									/>
									<span class="sr-only">{{ field.label }}</span>
								</button>
								<span class="text-muted-foreground w-8 text-sm">
									{{ isEnabled(field.key) ? 'Igen' : 'Nem' }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-4 rounded-md border">
				<div class="border-b px-3 py-2">
					<Label>Modulok sorrendje</Label>
				</div>
				<div class="flex flex-col gap-2 p-3">
					<div
						v-for="(moduleKey, index) in moduleOrder"
						:key="moduleKey"
						class="flex h-10 items-center gap-2 rounded-md border px-2 transition-opacity"
						:class="[
							moduleOrderClass(moduleKey),
							draggedModuleKey === moduleKey && 'opacity-50',
						]"
						draggable="true"
						@dragend="draggedModuleKey = null"
						@dragover.prevent
						@dragstart="handleDragStart($event, moduleKey)"
						@drop.prevent="moveDraggedModule(index)"
					>
						<GripVertical class="text-muted-foreground size-4 cursor-grab" />
						<span
							:aria-label="isModuleEnabled(moduleKey) ? 'Bekapcsolva' : 'Kikapcsolva'"
							class="inline-block size-2.5 shrink-0 rounded-full"
							:class="
								isModuleEnabled(moduleKey) ? 'bg-emerald-500' : 'bg-muted-foreground/40'
							"
						/>
						<span class="grow text-sm">{{ moduleOrderLabels[moduleKey] }}</span>
						<Button
							:disabled="index === 0"
							aria-label="Fel"
							size="icon"
							type="button"
							variant="ghost"
							@click="moveModule(index, -1)"
						>
							<ArrowUp class="size-4" />
						</Button>
						<Button
							:disabled="index === moduleOrder.length - 1"
							aria-label="Le"
							size="icon"
							type="button"
							variant="ghost"
							@click="moveModule(index, 1)"
						>
							<ArrowDown class="size-4" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	</ConfigFormSection>
</template>
