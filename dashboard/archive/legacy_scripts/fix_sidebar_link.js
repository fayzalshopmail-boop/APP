const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

const regex = /<Link[\s\S]*?key=\{item\.name\}[\s\S]*?href=\{item\.href\}[\s\S]*?onClick=\{\(\) => setSidebarOpen\(false\)\}[\s\S]*?className=\{cn\(/;

const replacement = `<Link
              key={item.name}
              href={item.href}
              onClick={(e) => {
                if (window.innerWidth < 768) {
                  e.preventDefault();
                  setSidebarOpen(false);
                  setTimeout(() => {
                    router.push(item.href);
                  }, 200);
                } else {
                  setSidebarOpen(false);
                }
              }}
              className={cn(`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
  console.log('Sidebar Link logic updated');
} else {
  console.log('Regex failed');
}
