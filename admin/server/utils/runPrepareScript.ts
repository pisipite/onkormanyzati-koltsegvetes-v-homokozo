import { exec } from 'child_process';

export default () => {
	return new Promise((resolve) => {
		exec(
			'npm run prepare',
			{
				cwd: useConfig().kokoDir,
			},
			resolve,
		);
	});
};
