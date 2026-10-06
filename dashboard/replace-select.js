const fs = require('fs');
let content = fs.readFileSync('src/app/customers/page.tsx', 'utf8');

const regex = /<select[\s\S]*?<\/select>/;

const replacement = `<Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as CustomerStatus | 'All')}>
              <SelectTrigger className="w-36 bg-card border-gray-800 h-[42px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Waiting for Parts">Waiting for Parts</SelectItem>
                <SelectItem value="Ready for Delivery">Ready for Delivery</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Returned (Unrepaired)">Returned</SelectItem>
              </SelectContent>
            </Select>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  
  if (!content.includes('import { Select')) {
    content = content.replace(
      "import { Input } from '@/components/ui/input';",
      "import { Input } from '@/components/ui/input';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';"
    );
  }

  fs.writeFileSync('src/app/customers/page.tsx', content, 'utf8');
  console.log('Replaced native select with Shadcn Select');
}
