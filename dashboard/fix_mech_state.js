const fs = require('fs');
let content = fs.readFileSync('src/app/mechanics/page.tsx', 'utf8');

content = content.replace(/const \[formData, setFormData\] = useState\(\{\s*name: '',\s*phone: '',/g, `const [formData, setFormData] = useState({\n      name: '',\n      phone: '+880',`);
content = content.replace(/setFormData\(\{ name: '', phone: '', address: '' \}\);/g, `setFormData({ name: '', phone: '+880', address: '' });`);

fs.writeFileSync('src/app/mechanics/page.tsx', content);
console.log('Mechanics state fixed');
