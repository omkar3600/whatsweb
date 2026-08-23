const { ForbiddenException } = require('@nestjs/common');

const ex = new ForbiddenException({ code: 'ACCOUNT_SUSPENDED' });
console.log(JSON.stringify(ex.getResponse()));
