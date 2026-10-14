const fs = require('fs');
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

const regex = /const isActive = pathname === item\.href;\s*const Icon = item\.icon;\s*return \(\s*<Link\s*key=\{item\.name\}\s*href=\{item\.href\}\s*onClick=\{\(e\) => \{[\s\S]*?className=\{cn\(/;

const replacement = `const isActive = pathname === item.href;
          const Icon = item.icon;
          const shouldReplace = pathname !== '/';
          
          return (
            <Link
              key={item.name}
              href={item.href}
              replace={shouldReplace}
              onClick={(e) => {
                if (window.innerWidth < 768) {
                  e.preventDefault();
                  setSidebarOpen(false);
                  setTimeout(() => {
                    if (shouldReplace) {
                      router.replace(item.href);
                    } else {
                      router.push(item.href);
                    }
                  }, 350);
                } else {
                  setSidebarOpen(false);
                }
              }}
              className={cn(`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
  console.log('Sidebar navigation history logic updated');
} else {
  console.log('Regex failed');
}
