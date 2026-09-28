<script setup lang="ts">
import { Bold, Heading2, Italic, Link, List } from 'lucide-vue-next';
import type { ComponentPublicInstance, HTMLAttributes } from 'vue';

const props = defineProps<{
	modelValue: string;
	placeholder?: string;
	textareaClass?: HTMLAttributes['class'];
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: string): void;
}>();

const textareaRef = ref<ComponentPublicInstance | HTMLTextAreaElement | null>(null);

function getTextarea() {
	const target = textareaRef.value;
	if (target instanceof HTMLTextAreaElement) return target;
	const element = target?.$el;
	return element instanceof HTMLTextAreaElement ? element : null;
}

function replaceSelection(
	replacer: (selected: string) => { nextCursorEnd?: number; nextCursorStart?: number; text: string },
) {
	const textarea = getTextarea();
	if (!textarea) return;
	const start = textarea.selectionStart;
	const end = textarea.selectionEnd;
	const selected = props.modelValue.slice(start, end);
	const replacement = replacer(selected);
	const value =
		props.modelValue.slice(0, start) + replacement.text + props.modelValue.slice(end);
	emit('update:modelValue', value);
	nextTick(() => {
		textarea.focus();
		textarea.setSelectionRange(
			start + (replacement.nextCursorStart ?? replacement.text.length),
			start + (replacement.nextCursorEnd ?? replacement.text.length),
		);
	});
}

function wrapSelection(prefix: string, suffix: string, fallback: string) {
	replaceSelection((selected) => {
		const content = selected || fallback;
		return {
			text: `${prefix}${content}${suffix}`,
			nextCursorStart: prefix.length,
			nextCursorEnd: prefix.length + content.length,
		};
	});
}

function prefixSelectedLines(prefix: string, fallback: string) {
	replaceSelection((selected) => {
		const content = selected || fallback;
		const text = content
			.split('\n')
			.map((line) => (line.trim() ? `${prefix}${line}` : line))
			.join('\n');
		return {
			text,
			nextCursorStart: prefix.length,
			nextCursorEnd: text.length,
		};
	});
}

function insertLink() {
	replaceSelection((selected) => {
		const label = selected || 'link szövege';
		const text = `[${label}](https://)`;
		return {
			text,
			nextCursorStart: label.length + 3,
			nextCursorEnd: text.length - 1,
		};
	});
}
</script>

<template>
	<div class="space-y-2">
		<div class="flex flex-wrap gap-1">
			<Button
				aria-label="Félkövér"
				size="icon"
				title="Félkövér"
				type="button"
				variant="outline"
				@mousedown.prevent
				@click="wrapSelection('**', '**', 'félkövér szöveg')"
			>
				<Bold class="size-4" />
			</Button>
			<Button
				aria-label="Dőlt"
				size="icon"
				title="Dőlt"
				type="button"
				variant="outline"
				@mousedown.prevent
				@click="wrapSelection('*', '*', 'dőlt szöveg')"
			>
				<Italic class="size-4" />
			</Button>
			<Button
				aria-label="Címsor"
				size="icon"
				title="Címsor"
				type="button"
				variant="outline"
				@mousedown.prevent
				@click="prefixSelectedLines('## ', 'Címsor')"
			>
				<Heading2 class="size-4" />
			</Button>
			<Button
				aria-label="Lista"
				size="icon"
				title="Lista"
				type="button"
				variant="outline"
				@mousedown.prevent
				@click="prefixSelectedLines('- ', 'Listaelem')"
			>
				<List class="size-4" />
			</Button>
			<Button
				aria-label="Link"
				size="icon"
				title="Link"
				type="button"
				variant="outline"
				@mousedown.prevent
				@click="insertLink"
			>
				<Link class="size-4" />
			</Button>
		</div>
		<Textarea
			ref="textareaRef"
			:class="textareaClass"
			:model-value="modelValue"
			:placeholder="placeholder"
			@update:model-value="emit('update:modelValue', String($event))"
		/>
	</div>
</template>
