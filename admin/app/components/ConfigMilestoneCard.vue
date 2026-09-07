<script setup lang="ts">
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-vue-next';

type MilestoneRow = {
	rowNumber: number;
	values: Record<string, string>;
};

type PickerOption = {
	group?: string;
	label?: string;
	value: string;
};

const props = defineProps<{
	imageFiles: string[];
	index: number;
	nodeOptions: PickerOption[];
	row: MilestoneRow;
	tagOptions: PickerOption[];
	total: number;
	videoFiles: string[];
}>();

const emit = defineEmits<{
	(e: 'delete', rowNumber: number, title: string): void;
	(e: 'duplicate', rowNumber: number): void;
	(e: 'move', rowNumber: number, direction: -1 | 1): void;
	(e: 'update', rowNumber: number, header: string, value: string): void;
}>();

const serverUrl = useServerUrl();
const EMPTY_SELECT_VALUE = '__none__';

function assetUrl(fileName: string) {
	if (!fileName) return '';
	return serverUrl(`/static/assets/ms/${fileName}`);
}

function selectValue(value: string | undefined) {
	return value?.trim() || EMPTY_SELECT_VALUE;
}

function splitCommaSeparated(value: string | undefined) {
	return (value || '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function getSelectedNodeIds(value: string | undefined) {
	return splitCommaSeparated(value);
}

function getSelectedTags(value: string | undefined) {
	return splitCommaSeparated(value);
}

function updateValue(header: string, value: string) {
	emit('update', props.row.rowNumber, header, value);
}

function updateSelectValue(header: string, value: string | number) {
	const nextValue = String(value);
	updateValue(header, nextValue === EMPTY_SELECT_VALUE ? '' : nextValue);
}

function updateCommaSeparatedValue(header: string, values: string[]) {
	updateValue(header, values.join(', '));
}
</script>

<template>
	<article
		class="bg-background grid min-w-0 gap-0 overflow-visible rounded-md border xl:grid-cols-[10rem_minmax(0,1fr)]"
		:data-milestone-row="row.rowNumber"
	>
		<div class="border-b p-3 xl:border-r xl:border-b-0">
			<div
				v-if="row.values.imageFile"
				class="bg-muted aspect-video rounded-sm bg-cover bg-center"
				:style="{ backgroundImage: `url(${assetUrl(row.values.imageFile)})` }"
			/>
			<div
				v-else
				class="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-sm text-sm"
			>
				Nincs kép
			</div>
			<div class="text-muted-foreground mt-2 truncate text-xs">
				{{ row.values.imageFile || 'Nincs képfájl kiválasztva' }}
			</div>
		</div>

		<div class="grid min-w-0 gap-3 p-3">
			<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<label class="grid min-w-0 flex-1 gap-1">
					<span class="text-sm font-medium">Cím</span>
					<Input
						:model-value="row.values.title"
						placeholder="Kártya címe"
						@update:model-value="updateValue('title', String($event))"
					/>
				</label>
			</div>

			<div class="grid min-w-0 gap-3 xl:grid-cols-2">
				<label class="grid min-w-0 gap-1">
					<span class="text-sm font-medium">Kép</span>
					<Select
						:model-value="selectValue(row.values.imageFile)"
						@update:model-value="updateSelectValue('imageFile', String($event))"
					>
						<SelectTrigger class="w-full">
							<SelectValue placeholder="Kép kiválasztása" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem :value="EMPTY_SELECT_VALUE">Nincs kép</SelectItem>
							<SelectItem
								v-for="fileName in imageFiles"
								:key="fileName"
								:value="fileName"
							>
								{{ fileName }}
							</SelectItem>
						</SelectContent>
					</Select>
				</label>

				<label class="grid min-w-0 gap-1">
					<span class="text-sm font-medium">Videó</span>
					<Select
						:model-value="selectValue(row.values.videoFile)"
						@update:model-value="updateSelectValue('videoFile', String($event))"
					>
						<SelectTrigger class="w-full">
							<SelectValue placeholder="Videó kiválasztása" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem :value="EMPTY_SELECT_VALUE">Nincs videó</SelectItem>
							<SelectItem
								v-for="fileName in videoFiles"
								:key="fileName"
								:value="fileName"
							>
								{{ fileName }}
							</SelectItem>
						</SelectContent>
					</Select>
				</label>

				<ConfigMultiValuePicker
					empty-text="Nincs találat."
					label="Kapcsoló költségvetési tétel"
					:model-value="getSelectedNodeIds(row.values.nodeId)"
					:options="nodeOptions"
					placeholder="Keresés kód vagy név szerint"
					@update:model-value="updateCommaSeparatedValue('nodeId', $event)"
				/>

				<ConfigMultiValuePicker
					allow-custom
					empty-text="Nincs korábbi címke. Enterrel újat adhatsz hozzá."
					label="Címkék"
					:model-value="getSelectedTags(row.values.tags)"
					:options="tagOptions"
					placeholder="Címke hozzáadása"
					@update:model-value="updateCommaSeparatedValue('tags', $event)"
				/>

				<label class="grid min-w-0 gap-1">
					<span class="text-sm font-medium">Geokoordináta</span>
					<Input
						:model-value="row.values.pos"
						placeholder="47.4979, 19.0402"
						@update:model-value="updateValue('pos', String($event))"
					/>
				</label>

				<div class="grid min-w-0 content-end gap-1">
					<span class="text-sm font-medium">Csak térképen</span>
					<div class="flex items-center">
						<button
							:aria-checked="row.values.onlyOnMap === '1'"
							class="border-input bg-background data-[state=checked]:bg-primary relative inline-flex h-8 w-16 items-center rounded-full border px-1 transition-colors"
							:data-state="row.values.onlyOnMap === '1' ? 'checked' : 'unchecked'"
							role="switch"
							type="button"
							@click="
								updateValue('onlyOnMap', row.values.onlyOnMap === '1' ? '0' : '1')
							"
						>
							<span
								class="bg-background pointer-events-none block size-6 rounded-full border shadow-sm transition-transform data-[state=checked]:translate-x-8"
								:data-state="row.values.onlyOnMap === '1' ? 'checked' : 'unchecked'"
							/>
							<span class="sr-only">Csak térképen</span>
						</button>
						<span class="text-muted-foreground ml-3 text-sm">
							{{ row.values.onlyOnMap === '1' ? 'Igen' : 'Nem' }}
						</span>
					</div>
				</div>
			</div>

			<label class="grid min-w-0 gap-1">
				<span class="text-sm font-medium">Leírás</span>
				<Textarea
					class="min-h-24"
					:model-value="row.values.descriptionInMarkdown"
					placeholder="Kártya szövege markdown formátumban"
					@update:model-value="updateValue('descriptionInMarkdown', String($event))"
				/>
			</label>
		</div>

		<div
			class="bg-muted/30 flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between xl:col-span-2"
		>
			<div class="flex items-center gap-2">
				<Button
					:disabled="index === 0"
					size="sm"
					type="button"
					variant="outline"
					@click="emit('move', row.rowNumber, -1)"
				>
					<ArrowUp />
					Fel
				</Button>
				<Button
					:disabled="index === total - 1"
					size="sm"
					type="button"
					variant="outline"
					@click="emit('move', row.rowNumber, 1)"
				>
					<ArrowDown />
					Le
				</Button>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					size="sm"
					type="button"
					variant="outline"
					@click="emit('duplicate', row.rowNumber)"
				>
					<Copy />
					Másolás másik évbe
				</Button>
				<Button
					size="sm"
					type="button"
					variant="destructive"
					@click="emit('delete', row.rowNumber, row.values.title)"
				>
					<Trash2 />
					Törlés
				</Button>
			</div>
		</div>
	</article>
</template>
