import re

with open('src/modules/users/users.service.ts', 'r', encoding='utf8') as f:
    code = f.read()

# Replace id: string with id: number in method signatures
code = re.sub(r'async ([\w]+)\(([^)]*)id:\s*string([^)]*)\)', r'async \1(\2id: number\3)', code)
code = re.sub(r'assignPermissions\(id:\s*string', r'assignPermissions(id: number', code)
code = re.sub(r'remove\(id:\s*string', r'remove(id: number', code)

# Fix Map definitions and userIds arrays
code = re.sub(r'userIds:\s*string\[\]', r'userIds: number[]', code)
code = re.sub(r'Map<string,\s*\{', r'Map<number, {', code)

# Fix user.company and user.branch mapping in toResponse
code = re.sub(r'id:\s*string;\s*companyName:', r'id: number; companyName:', code)
code = re.sub(r'id:\s*string;\s*name:\s*string;\s*code:', r'id: number; name: string; code:', code)

# Fix detailedPermissions user map
code = re.sub(r'userId:\s*string', r'userId: number', code)

with open('src/modules/users/users.service.ts', 'w', encoding='utf8') as f:
    f.write(code)
