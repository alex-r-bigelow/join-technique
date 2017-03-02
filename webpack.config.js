'use strict';

var path = require('path');
var webpack = require('webpack');
var CleanWebpackPlugin = require('clean-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Entry point for static analyzer
  entry: './index.js',

  output: {
    // Where to build results
    path: path.join(__dirname, 'docs'),

    // Filename to use in HTML
    filename: 'webpack-bundle.js'
  },
  devtool: 'cheap-source-map',
  plugins: [
    new CleanWebpackPlugin([
      './docs'
    ]),
    new HtmlWebpackPlugin({
      template: 'index.html', // Load a custom template
      inject: 'body' // Inject all scripts into the body
    }),
    new webpack.ProvidePlugin({
      jQuery: 'jquery'
    })
  ],
  node: {
    fs: 'empty'
  },
  module: {
    loaders: [
      {
        test: /\.htaccess$/,
        loader: 'file-loader',
        query: {
          name: '.htaccess'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      },
      {
        test: /\.html$/,
        loader: 'html-loader?attrs=img:src'
      },
      {
        test: /\.jpe?g$|\.gif$|\.png$|(?!template\b)\b\w+\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/,
        loader: 'url-loader'
      },
      {
        test: /template\.svg$/,
        loader: 'html-loader',
        query: {
          attrs: 'image:xlink:href'
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /(node_modules|web_client)/,
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};
