export default defineEventHandler((event) => {
	return zip(
		event,
		'koko-code.zip',
		['input', 'scripts', 'src', 'static'],
		[
			'LICENSE',
			'README.md',
			'nuxt.config.ts',
			'package.json',
			'package-lock.json',
			'tsconfig.json',
		],
	);
});
