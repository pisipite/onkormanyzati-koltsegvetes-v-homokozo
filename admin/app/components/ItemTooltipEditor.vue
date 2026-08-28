<script setup lang="ts">
import { Copy } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { cn } from '~/lib/utils';

const props = defineProps<{
	code: string;
	name: string;
	namesByYear: Record<string, string>;
	year: string;
	years: string[];
}>();

const dialogOpen = defineModel<boolean>('open', { required: true });
const tooltipYears = computed(() => props.years);
const { getEntry, setTooltip } = await useBudgetTooltips(tooltipYears);
const draft = ref('');

function normalizedName(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

const sources = computed(() =>
	props.years
		.filter((year) => year !== props.year)
		.map((year) => {
			const entry = getEntry(year, props.code);
			if (!entry?.text.trim()) return null;
			const budgetName = props.namesByYear[year] || '';
			return {
				hasSameName:
					Boolean(budgetName) && normalizedName(budgetName) === normalizedName(props.name),
				name: budgetName || 'Ebben az évben nincs ilyen kód',
				text: entry.text,
				year,
			};
		})
		.filter((source): source is NonNullable<typeof source> => Boolean(source)),
);

watch(
	dialogOpen,
	(open) => {
		if (!open) return;
		draft.value = getEntry(props.year, props.code)?.text || '';
	},
	{ immediate: true },
);

function copySource(text: string) {
	draft.value = text;
}

function saveTooltip() {
	if (!getEntry(props.year, props.code) && !draft.value.trim()) {
		dialogOpen.value = false;
		return;
	}
	setTooltip(props.year, props.code, props.name, draft.value);
	dialogOpen.value = false;
	toast.success(`${props.year} ${props.code}: a súgószöveg bekerült a nem mentett módosítások közé.`);
}
</script>

<template>
	<Dialog v-model:open="dialogOpen">
		<DialogContent class="sm:max-w-2xl">
			<DialogHeader>
				<DialogTitle>{{ code }} súgószövege</DialogTitle>
				<DialogDescription>
					<span class="font-medium text-foreground">{{ year }}</span>
					<span> · {{ name }}</span>
				</DialogDescription>
			</DialogHeader>

			<div class="grid gap-4">
				<label class="grid gap-1">
					<span class="text-sm font-medium">Súgószöveg</span>
					<Textarea
						v-model="draft"
						class="min-h-32 resize-y"
						placeholder="Az adott évhez tartozó súgószöveg"
					/>
					<span class="text-muted-foreground text-right text-xs">
						{{ draft.length }} karakter
					</span>
				</label>

				<div class="grid gap-2">
					<div class="text-sm font-medium">Másolás másik évből</div>
					<div
						v-if="sources.length"
						class="max-h-64 overflow-y-auto rounded-md border"
					>
						<div
							v-for="source in sources"
							:key="source.year"
							class="flex items-start gap-3 border-b px-3 py-2 last:border-b-0"
						>
							<div class="w-12 shrink-0 text-sm font-semibold">{{ source.year }}</div>
							<div class="min-w-0 flex-1 space-y-1">
								<div
									:class="
										cn(
											'w-fit max-w-full rounded border px-1.5 py-0.5 text-xs font-medium',
											source.hasSameName
												? 'border-emerald-300 bg-emerald-50 text-emerald-800'
												: 'border-red-300 bg-red-50 text-red-800',
										)
									"
								>
									{{ source.name || 'Ebben az évben nincs ilyen kód' }}
								</div>
								<ItemTooltipSourcePreview :text="source.text" />
							</div>
							<Button
								class="shrink-0"
								size="sm"
								type="button"
								variant="secondary"
								@click="copySource(source.text)"
							>
								<Copy />
								Másolás
							</Button>
						</div>
					</div>
					<div
						v-else
						class="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-sm"
					>
						Más évben nincs elmentett súgószöveg ehhez a kódhoz.
					</div>
				</div>
			</div>

			<DialogFooter>
				<DialogClose as-child>
					<Button variant="outline">Mégse</Button>
				</DialogClose>
				<Button @click="saveTooltip">Alkalmazás</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</template>
