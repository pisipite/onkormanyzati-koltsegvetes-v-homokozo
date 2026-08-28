import fs from 'fs';
import ExcelJS from 'exceljs';
import { parseConfigWorkbook } from './prepare-config-lib';

const INPUT_FILE = './input/config.xlsx';
const OUTPUT_FILE = './src/data/config.json';

export default async () => {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.readFile(INPUT_FILE);
	const configJson = parseConfigWorkbook(workbook);

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(configJson));
};
