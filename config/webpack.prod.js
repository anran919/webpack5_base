const { resolve } = require('path')
const ESLintPlugin = require('eslint-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const WorkboxPlugin = require('workbox-webpack-plugin');
// webpack v5 开箱即带有最新版本的 terser-webpack-plugin
const TerserPlugin = require('terser-webpack-plugin')
const os = require('os')
// 获取cpu核心数
const threads = os.cpus().length
function getStyleLoader(pre) {
  return [
    // 不同于dev,prod使用 ‘MiniCssExtractPlugin.loader’,会将css提取为单独的文件,并将多个css文件单独提取为一个文件
    MiniCssExtractPlugin.loader,
    'css-loader',
    //  css 兼容处理 , 还需要在package.json 中配置browserslist
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: [
            ['postcss-preset-env'] // 能处理大部分兼容问题
          ]
        }
      }
    },
    pre
  ].filter(Boolean)
}

module.exports = {
  // 多入口打包
  // entry: {
  //   main: './main.js',
  //   app: './app.js'
  // },
  // output: {
  //   filename: 'js/[name].js',
  //   path: resolve(__dirname, '../dist'),
  //   clean: true
  // },
  // 单入口打包
  entry: './main.js',
  output: {
    filename: 'js/main.js',
    path: resolve(__dirname, '../dist'),
    // 给打包输出的其他文件命名,
    chunkFilename:"js/[name].js",
    // 自动清理上次打包内容
    clean: true
  },
  // loader 配置
  module: {
    rules: [
      {
        oneOf: [
          { test: /\.css$/, use: getStyleLoader() },
          { test: /\.less$/, use: getStyleLoader('less-loader') },
          { test: /\.s[ac]ss$/, use: getStyleLoader('sass-loader') },
          { test: /\.stylus$/, use: getStyleLoader('stylus-loader') },
          // 图片资源处理
          {
            test: /\.(png|jpe?g|gif|webp|svg)$/,
            type: 'asset',
            // 各种图片资源/base64图片,处理
            parser: { dataUrlCondition: { maxSize: 4 * 1024 }},
            generator: {
              filename: 'static/images/[hash:10][ext][query]'
            }
          },
          // iconfont 字体图标/音视频 处理
          {
            test: /\.(ttf|woff|woff2|mp3|mp4|avi)$/,
            type: 'asset/resource',
            generator: {
              filename: 'static/media/[hash:10][ext][query]'
            }
          },
          // babel 配置
          {
            test: /\.js$/,
            // exclude: /(node_modules)/, // 排除node_modules
            include: resolve(__dirname, '../src'),
            use: [
              //  开启多进程,对bable处理
              {
                loader: 'thread-loader',
                // 有同样配置的 loader 会共享一个 worker 池
                options: {
                  // 产生的 worker 的数量，默认是 (cpu 核心数 - 1)，或者，
                  // 在 require('os').cpus() 是 undefined 时回退至 1
                  workers: threads
                }
              },
              {
                loader: 'babel-loader'
                // babel配置文件options,单独写在babel.config.js文件中
                // options: {
                //   presets: ['@babel/preset-env']
                // }
              }
            ]
          }
        ]
      }
    ]
  },
  optimization: {
    minimizer: [
      // 在 webpack@5 中，你可以使用 `...` 语法来扩展现有的 minimizer（即 `terser-webpack-plugin`），将下一行取消注释
      // `...`,
      new CssMinimizerPlugin()
    ],
    // 多入口打包去除重复依赖文件
    splitChunks: {
      chunks: 'async', // chunks: 'all'
    //   // 以下是默认配置
    //   cacheGroups: {
    //     svgGroup: {
    //       test(module) {
    //         // `module.resource` contains the absolute path of the file on disk.
    //         // Note the usage of `path.sep` instead of / or \, for cross-platform compatibility.
    //         const path = require('path')
    //         return (
    //           module.resource &&
    //           module.resource.endsWith('.svg') &&
    //           module.resource.includes(`${path.sep}cacheable_svgs${path.sep}`)
    //         )
    //       }
    //     },
    //     byModuleTypeGroup: {
    //       test(module) {
    //         return module.type === 'javascript/auto'
    //       }
    //     }
    //   }
    }
  },
  plugins: [
    // eslint 插件,需要配合.eslintrc.js 文件,.eslintignore 忽略文件,vscode eslint插件
    new ESLintPlugin({
      context: resolve(__dirname, '../src'),
      cache: true, // 开启缓存
      cacheLocation: resolve(__dirname, '../node_modules/.cache/eslintCache'),
      threads: threads // 开启多线程
    }),
    new HtmlWebpackPlugin({
      // 配置要打包的html 文件的位置 ,会自动引入打包需要的资源
      template: resolve(__dirname, '../public/index.html'),
      // title: 'Output Management',
      title: 'Progressive Web Application',
    }),
    // 这个插件使用 cssnano 优化和压缩 CSS。
    new MiniCssExtractPlugin(),
    // 本插件会将 CSS 提取到单独的文件中，为每个包含 CSS 的 JS 文件创建一个 CSS 文件
    new MiniCssExtractPlugin({
      filename: 'static/css/main.css'
    }),
    // webpack v5 开箱即带有最新版本的 terser-webpack-plugin,该插件使用 terser 来压缩 JavaScript。
    new TerserPlugin(
      {
        // parallel: true
        parallel: threads // 启用多进程并发运行并设置并发运行次数。
      }
    ),
    new WorkboxPlugin.GenerateSW({
      // 这些选项帮助快速启用 ServiceWorkers
      // 不允许遗留任何“旧的” ServiceWorkers
      clientsClaim: true,
      skipWaiting: true,
    }),
  ],
  mode: 'production',
  //  源码和编译后的代码映射关系,方便调试,定位错误
  devtool: 'source-map'
}
