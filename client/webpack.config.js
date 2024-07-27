const path = require('path');
const HWP = require('html-webpack-plugin');
const webpack = require('webpack')
const WebpackBundleAnalyzer = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');

var InlineChunkHtmlPlugin = require('inline-chunk-html-plugin');

module.exports={
	entry:{
		client:["regenerator-runtime/runtime.js", path.join(__dirname,'/src/client.js')],
		index:["regenerator-runtime/runtime.js", path.join(__dirname,'/src/index.js')],
	},
	output:{
		filename:'[name].[contenthash].js',
		path:path.join(__dirname,'../public'),
    	sourceMapFilename: '[name].[contenthash].map.js',
    	
	},
	module:{
		rules:[
		{
			test:/\.(js|jsx)$/,
			exclude:/node_modules/,
			loader:'babel-loader'
		},
		{
		  test: /\.(jpg|png|svg|gif)$/,
		  type: 'asset/resource',
		},
		{
      test: /\.css$/i,
      use: ['style-loader', 'css-loader'],
  	}]
	},
	plugins:[
			new HWP(
		{
			template:path.join(__dirname,'/src/client.html'),
			minify: {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                useShortDoctype: true
            },
            chunks:['client'],
            filename:'client.html'
        }
		),
			new HWP(
		{
			template:path.join(__dirname,'/src/index.html'),
			minify: {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                useShortDoctype: true
            },
            chunks:['index'],
            filename:'index.html'
        }
		),
			new CopyWebpackPlugin({
            patterns: [
          			{ 
                	from: "css/*",
                	to:path.join(__dirname,"../public/"),
									context: "assets/",
                	toType:'dir'
          			},
          			{ 
                	from: "img/*",
                	to:path.join(__dirname,"../public/"),
									context: "assets/",
                	toType:'dir'
          			},
          			{ 
                	from: "js/*",
                	to:path.join(__dirname,"../public/"),
									context: "assets/",
                	toType:'dir'
          			},
          			{ 
                	from: "vendor/*/*",
                	to:path.join(__dirname,"../public/"),
									context: "assets/",
                	toType:'dir'
          			},
            ]
        }),
		//new WebpackBundleAnalyzer(),
    new webpack.IgnorePlugin({
			  resourceRegExp: /^\.\/locale$/,
			  contextRegExp: /moment$/,
			}),
	],
	resolve: {
	    extensions: ['', '.js', '.jsx'],
	  }
}