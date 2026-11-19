const { pressKitHandler } = require('../../api/_lib/pressKit');
const { toNetlifyHandler } = require('./_adapter');

exports.handler = toNetlifyHandler(pressKitHandler);
