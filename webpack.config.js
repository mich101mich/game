const path = require('path');

module.exports = {
	entry: './src/main.ts',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.wasm']
	},
	output: {
		path: path.resolve(__dirname),
		filename: 'dist/bundle.js',
		chunkFilename: 'dist/chunk.bundle.js',
		webassemblyModuleFilename: 'dist/bundle.wasm'
	},
	mode: 'production'
};