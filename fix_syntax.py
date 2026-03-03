import sys

with open('src/services/notificationService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# I am replacing \` with ` and \$ with $
content = content.replace('\\`', '`').replace('\\$', '$')

with open('src/services/notificationService.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
