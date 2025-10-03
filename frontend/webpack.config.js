const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { resolve } = require('path');

module.exports = (env, argv) => {
  const prod = argv.mode === 'production' ? 'prod' : 'dev';

  return {
    mode: prod === 'prod' ? 'production' : 'development',
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
            replacement: resolve(`./environments/environment.${prod}.ts`),
          }
        },
        {
          test: /\.(png|jpe?g|gif|ico)$/i,
          type: 'asset/resource',
          generator: {
            filename: '[name][ext]'
          }
        }
      ]
    },
    devServer: {
      historyApiFallback: true,
    },
    devtool: prod === 'prod' ? undefined : 'source-map',
    plugins: [
      new HtmlWebpackPlugin({
        template: 'index.html',
        favicon: 'favicon.png'
      }),
      new MiniCssExtractPlugin()
    ]
  }
};
