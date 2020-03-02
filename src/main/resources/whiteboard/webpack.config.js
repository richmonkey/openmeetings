const path = require('path');

module.exports = {
    entry: {
        classroom:'./classroom.js'
    },
    target: 'node',
    devtool: 'source-map',
    node: {
        __dirname: false,
        __filename: false,
    },

    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, '.')
    },

    module: {
        rules: [
            {
                test: /\.ts(x?)$/,
                exclude: /node_modules/,
                use: [
                    {
						loader: "ts-loader",
						options: {
							transpileOnly: true,
							experimentalWatchApi: true,
						},
                    },
                ]
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ['@babel/preset-env', '@babel/preset-react']
                        }
                    },

                ]
            },
            {
                test: /antd\.css$/,
                use: [ 'style-loader', 'css-loader' ]
            },

            {
				test: /app\.less$/,
				use: [ 
                    {
                        loader:'style-loader',
                    },
					{
                        loader:'css-loader',
                        options: {
                            url:false,
                        }
                    },
					{
						loader:'less-loader'
                    } 
                ],
            },



            {
                test: /\.less$/,
                exclude: /app\.less$/,
				use: [ 
                    {
                        loader:'style-loader',
                    },
					{
						loader:'css-loader',
						options: {
                            url:false,
							importLoaders: 1,
                            modules: true,
                            sourceMap: false,
							localIdentName: "[name]__[local]___[hash:base64:5]"  // 为了生成类名不是纯随机
						},
                    },
					{
						loader:'less-loader'
                    } 
                ],
            },




            //todo more test, maybe chrome bug
            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            // {
            //     enforce: "pre",
            //     test: /\.js$/,
            //     loader: "source-map-loader"
            // },
        ]
    },

    externals: [
        (function () {
            var IGNORES = [
                'electron',
                'sqlite3'
            ];
            return function (context, request, callback) {
                if (IGNORES.indexOf(request) >= 0) {
                    return callback(null, "require('" + request + "')");
                }
                return callback();
            };
        })()
    ],

    resolve: {
        // Add `.ts` and `.tsx` as a resolvable extension.
        extensions: ['.ts', '.tsx', '.js']
    }
};
