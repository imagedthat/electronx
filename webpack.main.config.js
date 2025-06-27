const path = require('path');

module.exports = {
  target: 'electron-main',
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@assets': path.resolve(__dirname, 'assets')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.main.json'
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    'electron': 'commonjs electron',
    'electron-log': 'commonjs electron-log',
    'electron-store': 'commonjs electron-store',
    'electron-updater': 'commonjs electron-updater',
    'electron-window-state': 'commonjs electron-window-state',
    'node-notifier': 'commonjs node-notifier',
    'semver': 'commonjs semver'
  },
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false,
  optimization: {
    minimize: process.env.NODE_ENV === 'production'
  }
};