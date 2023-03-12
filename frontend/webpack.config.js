const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { resolve } = require('path');

module.exports = (env, argv) => {
  const stage = argv.mode === 'production' ? 'prod' : 'dev';

  return {
    mode: stage === 'prod' ? 'production' : 'development',
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    entry: './src/index.tsx',
    output: {
      path: __dirname + '/dist/',
      filename: 'index_bundle.js',
      publicPath: '/'
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          resolve: {
            extensions: ['.ts', '.tsx', '.js', '.json'],
          },
          use: 'ts-loader',
        },
        {
          test: /\.css$/i, // (s(a|c)ss)?$
          use: ['style-loader', 'css-loader', 'postcss-loader'], //MiniCssExtractPlugin.loader,  'sass-loader'
        },
        {
          test: /environment\.ts?$/,
          loader: 'file-replace-loader',
          options: {
            replacement: resolve(`./environments/environment.${stage}.ts`),
          }
        }
      ]
    },
    devServer: {
      historyApiFallback: true,
    },
    devtool: stage === 'prod' ? undefined : 'source-map',
    plugins: [
      new HtmlWebpackPlugin({
        template: 'index.html',
      }),
      new MiniCssExtractPlugin()
    ]
  }
};
