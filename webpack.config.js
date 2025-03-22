const path = require("path");

module.exports = {
  entry: "./src/public/js/chatbot-widget.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "chatbot-widget.js",
    path: path.resolve(__dirname, "dist/public/js"),
  },
};
