import type { Worksheet } from 'exceljs';
import { parseEconomicDescriptor } from '../../../scripts/prepare-data-lib';

export type TrackerNode = {
	children: TrackerNode[];
	code: string;
	isChartVisible: boolean;
	name: string;
	parentCode: string;
	rowNumber: number;
	value: number;
};

export type EconomicSourceRow = {
	code: string;
	isChartVisible: boolean;
	name: string;
	rowNumber: number;
	value: number;
};

export type EconomicRowChange = {
	code: string;
	name: string;
	nextCode: string;
	rowNumber: number;
};

export function economicDescriptor(name: string, code: string) {
	return name ? `${name} (${code})` : `(${code})`;
}

export function readEconomicRows(sheet: Worksheet) {
	const rows: EconomicSourceRow[] = [];
	for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber++) {
		const row = sheet.getRow(rowNumber);
		const { id, name } = parseEconomicDescriptor(row.getCell(2).value?.toString() || '');
		if (!id || id.includes('-')) continue;
		const visibilityValue = row.getCell(1).value?.toString().trim() || '';
		const valueCell = row.getCell(3);
		const rawValue = (valueCell.result || valueCell.value)?.toString() || '';
		rows.push({
			code: id,
			isChartVisible: Boolean(visibilityValue),
			name,
			rowNumber,
			value: Number(rawValue.replace(/[^0-9-]+/g, '')),
		});
	}
	return rows;
}

function rootCodePrefix(code: string) {
	return code.match(/^(?:FH|FT|[A-Z]+)/)?.[0] || '';
}

export function hasSameCodeShape(code: string, nextCode: string) {
	const currentPrefix = rootCodePrefix(code);
	const nextPrefix = rootCodePrefix(nextCode);
	return currentPrefix === nextPrefix && code.length === nextCode.length;
}

export function buildTrackerNodes(sourceRows: EconomicSourceRow[]) {
	const primaryNodes = new Map<string, TrackerNode>();
	const detailNodes: TrackerNode[] = [];

	for (const row of sourceRows) {
		const node: TrackerNode = {
			children: [],
			code: row.code,
			isChartVisible: row.isChartVisible,
			name: row.name,
			parentCode: rootCodePrefix(row.code),
			rowNumber: row.rowNumber,
			value: row.value,
		};
		if (row.name.startsWith('ebből:') || primaryNodes.has(row.code)) detailNodes.push(node);
		else primaryNodes.set(row.code, node);
	}

	const roots: TrackerNode[] = [];
	for (const detail of detailNodes) {
		const parent = primaryNodes.get(detail.code);
		if (parent) {
			detail.parentCode = parent.code;
			parent.children.push(detail);
		} else roots.push(detail);
	}

	const nodes = Array.from(primaryNodes.values()).sort((first, second) =>
		first.code.localeCompare(second.code, 'hu', { numeric: true }),
	);
	for (const node of nodes) {
		if (node.code.length === 2 || node.code.startsWith('F')) {
			roots.push(node);
			continue;
		}
		const parent = nodes.reduce<TrackerNode | undefined>((closest, candidate) => {
			if (candidate === node || !node.code.startsWith(candidate.code)) return closest;
			if (candidate.code.length >= node.code.length) return closest;
			return !closest || candidate.code.length > closest.code.length ? candidate : closest;
		}, undefined);
		if (parent) {
			node.parentCode = parent.code;
			parent.children.push(node);
		} else roots.push(node);
	}

	return roots;
}

export function findSiblingContext(nodes: TrackerNode[], rowNumber: number) {
	const index = nodes.findIndex((node) => node.rowNumber === rowNumber);
	if (index >= 0) return { index, siblings: nodes };
	for (const node of nodes) {
		const result = findSiblingContext(node.children, rowNumber);
		if (result) return result;
	}
	return undefined;
}

export function findTrackerNode(nodes: TrackerNode[], code: string): TrackerNode | undefined {
	for (const node of nodes) {
		if (node.code === code) return node;
		const match = findTrackerNode(node.children, code);
		if (match) return match;
	}
	return undefined;
}

function containsCode(nodes: TrackerNode[], code: string): boolean {
	return Boolean(findTrackerNode(nodes, code));
}

function lastSubtreeRowNumber(node: TrackerNode): number {
	return node.children.reduce(
		(lastRow, child) => Math.max(lastRow, lastSubtreeRowNumber(child)),
		node.rowNumber,
	);
}

export function findMissingRowInsertion(
	nodes: TrackerNode[],
	reference: Pick<TrackerNode, 'code' | 'parentCode'>,
) {
	let parent: TrackerNode | undefined;
	let siblings = nodes;

	if (!/^[A-Z]+$/.test(reference.parentCode)) {
		parent = findTrackerNode(nodes, reference.parentCode);
		if (!parent) return { missingParentCode: reference.parentCode } as const;
		siblings = parent.children;
	}

	const following = siblings.find(
		(node) => node.code.localeCompare(reference.code, 'hu', { numeric: true }) > 0,
	);
	if (following) return { rowNumber: following.rowNumber } as const;

	const previous = [...siblings]
		.reverse()
		.find((node) => node.code.localeCompare(reference.code, 'hu', { numeric: true }) <= 0);
	return {
		rowNumber: previous ? lastSubtreeRowNumber(previous) + 1 : (parent?.rowNumber || 2) + 1,
	} as const;
}

export function hasAvailableParent(nodes: TrackerNode[], node: TrackerNode, nextCode: string) {
	if (node.name.startsWith('ebből:')) return true;
	if (node.parentCode === rootCodePrefix(node.code)) return true;
	return containsCode(nodes, nextCode.slice(0, node.parentCode.length));
}

export function shiftSiblingCode(node: TrackerNode, offset: -1 | 1) {
	const suffix = node.code.slice(node.parentCode.length);
	if (!/^\d+$/.test(suffix)) return undefined;
	const shiftedNumber = Number(suffix) + offset;
	if (shiftedNumber < 0) return undefined;
	const shifted = String(shiftedNumber).padStart(suffix.length, '0');
	if (shifted.length !== suffix.length) return undefined;
	return `${node.parentCode}${shifted}`;
}

export function createSubtreeCodeChanges(root: TrackerNode, nextRootCode: string) {
	const changes: EconomicRowChange[] = [];
	let valid = true;

	function visit(node: TrackerNode) {
		if (!node.code.startsWith(root.code)) valid = false;
		else if (node.rowNumber) {
			changes.push({
				code: node.code,
				name: node.name,
				nextCode: `${nextRootCode}${node.code.slice(root.code.length)}`,
				rowNumber: node.rowNumber,
			});
		}
		for (const child of node.children) visit(child);
	}

	visit(root);
	return valid ? changes : undefined;
}

export function findCodeCollision(
	sourceRows: EconomicSourceRow[],
	changes: EconomicRowChange[],
	allowedCollisionRows = new Set<number>(),
) {
	const changedRows = new Set(
		changes
			.filter((change) => change.code !== change.nextCode)
			.map((change) => change.rowNumber),
	);
	const plannedCodes = new Map<string, string>();

	for (const change of changes) {
		if (change.code === change.nextCode || allowedCollisionRows.has(change.rowNumber)) continue;
		const previousCode = plannedCodes.get(change.nextCode);
		if (previousCode && previousCode !== change.code) return change.nextCode;
		plannedCodes.set(change.nextCode, change.code);

		const collides = sourceRows.some(
			(row) => !changedRows.has(row.rowNumber) && row.code === change.nextCode,
		);
		if (collides) return change.nextCode;
	}
	return undefined;
}

export function applyEconomicRowChanges(sheet: Worksheet, changes: EconomicRowChange[]) {
	for (const change of changes) {
		sheet.getRow(change.rowNumber).getCell(2).value = economicDescriptor(
			change.name,
			change.nextCode,
		);
	}
}
