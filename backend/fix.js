const fs = require('fs');
let code = fs.readFileSync('src/modules/users/users.service.ts', 'utf8');

let startIdx = code.indexOf('if (branch.companyId !== requester.companyId) {');
let endIdx = code.indexOf('    }));\n  }', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  let goodCode = `if (branch.companyId !== requester.companyId) {\n      throw new ForbiddenException("Branch does not belong to your company");\n    }\n    return { companyId: requester.companyId, branchId: branch.id };\n  }`;
  code = code.substring(0, startIdx) + goodCode + code.substring(endIdx + 11);
}

code = code.replace(/async ([\w]+)\(([^)]*)id:\s*string([^)]*)\)/g, 'async $1($2id: number$3)');
code = code.replace(/id:\s*string\[\]/g, 'id: number[]');

fs.writeFileSync('src/modules/users/users.service.ts', code);
