const fs = require('fs');
let content = fs.readFileSync('src/app/inventory/page.tsx', 'utf8');

const editStr = `<Button variant="ghost" size="icon" onClick={() => handleOpenModal(item)} className="h-8 w-8 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
                          title="Edit Part"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>`;
const delStr = `<Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(item.id)} className="h-8 w-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-lg transition-colors"
                          title="Delete Part"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>`;

const target = editStr + '\n                        ' + delStr;
const newStr = `{hasFullAccess && (<>\n                        ` + target + `\n                        </>)}`;

// Let's just do a simpler string replace by searching for pieces if exact match fails
if (content.includes('title="Edit Part"')) {
    // Find the index of title="Edit Part"
    const editIndex = content.indexOf('title="Edit Part"');
    // Find the nearest <Button before it
    const buttonStart = content.lastIndexOf('<Button', editIndex);
    // Find the nearest </Button> after title="Delete Part"
    const delIndex = content.indexOf('title="Delete Part"', editIndex);
    const buttonEnd = content.indexOf('</Button>', delIndex) + '</Button>'.length;
    
    const matched = content.substring(buttonStart, buttonEnd);
    content = content.replace(matched, `{hasFullAccess && (<>\n` + matched + `\n</>)}`);
    fs.writeFileSync('src/app/inventory/page.tsx', content);
    console.log('Fixed exactly!');
}
