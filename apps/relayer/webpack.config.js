const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/main.ts', // Adjust the entry file accordingly
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js', '.html', '.json'],
  },
  externals: [
    nodeExternals({
      allowlist: [/@database/, /@backend/, /@shared/],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          getCustomTransformers: (program) => ({
            before: [
              require('@nestjs/swagger/plugin').before(
                {
                  introspectComments: true,
                },
                program,
              ),
            ],
          }),
        },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
      },
      {
        test: /\.json$/,
        type: 'json',
      },
    ],
  },
};
