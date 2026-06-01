import { CONFIG_FILE } from '../utils/constants';

export default defineEventHandler(async (event) => {
	await callNodeListener(
		useMulter(INPUT_DIR, CONFIG_FILE, [XLSX_MIME_TYPE]).single('config') as Parameters<
			typeof callNodeListener
		>[0],
		event.node.req,
		event.node.res,
	);
	await runPrepareScript(); // in order to regenerate functions.tsv
});
