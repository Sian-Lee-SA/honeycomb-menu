/**
 * @Author: Sian Croser
 * @Date:   2020-04-27T05:25:15+09:30
 * @Email:  CQoute@gmail.com
 * @Filename: webpack.config.js
 * @Last modified by:   Sian Croser
 * @Last modified time: 2020-04-27T05:26:01+09:30
 * @License: GPL-3
 */
const path = require('path');

module.exports = {
    entry: './src/honeycomb-menu.js',
    mode: 'production',
    output: {
        filename: 'honeycomb-menu.js',
        path: path.resolve(__dirname)
    }
};
