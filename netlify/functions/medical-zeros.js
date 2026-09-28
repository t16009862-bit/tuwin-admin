const { toNetlifyHandler } = require('./_adapter');
const { TABS } = require('../../api/_lib/simpleTabs');

exports.handler = toNetlifyHandler(TABS['medical-zeros']);
