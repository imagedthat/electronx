const path = require('path');

module.exports = {
  target: 'electron-preload',
  mode: process.env.NODE_ENV || 'development',
  entry: './src/renderer/preload/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'preload.js',
    clean: false
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.renderer.json'
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  externals: {
    'electron': 'commonjs electron'
  },
  node: {
    __dirname: false,
    __filename: false
  },
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false
};