const fs = require('fs');
let code = fs.readFileSync('src/components/ui/CustomSelect.tsx', 'utf8');

const oldInterface = `interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  icon?: React.ReactNode;
}`;

const newInterface = `export interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  icon?: React.ReactNode;
}`;

code = code.replace(oldInterface, newInterface);

const oldOptMap = `options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChange(opt);
                        setIsOpen(false);
                      }}
                      className={\`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                        \${value === opt 
                          ? 'bg-blue-500/10 text-blue-400 font-medium' 
                          : 'text-gray-300 hover:bg-secondary hover:text-white'
                        }\`}
                    >
                      {opt}
                      {value === opt && <Check className="w-4 h-4 text-blue-500" />}
                    </button>
                  ))`;

const newOptMap = `options.map((opt) => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                    <button
                      key={optValue}
                      type="button"
                      onClick={() => {
                        onChange(optValue);
                        setIsOpen(false);
                      }}
                      className={\`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                        \${value === optValue 
                          ? 'bg-blue-500/10 text-blue-400 font-medium' 
                          : 'text-gray-300 hover:bg-secondary hover:text-white'
                        }\`}
                    >
                      {optLabel}
                      {value === optValue && <Check className="w-4 h-4 text-blue-500" />}
                    </button>
                    );
                  })`;

code = code.replace(oldOptMap, newOptMap);

// Fix the selected value display
const oldDisplay = `<span className={value ? 'text-gray-100' : 'text-gray-600'}>
            {value || placeholder}
          </span>`;

const newDisplay = `<span className={value ? 'text-gray-100' : 'text-gray-600'}>
            {
              value 
                ? (typeof options[0] === 'object' 
                    ? (options.find(o => typeof o !== 'string' && o.value === value) as SelectOption)?.label || value 
                    : value) 
                : placeholder
            }
          </span>`;

code = code.replace(oldDisplay, newDisplay);

fs.writeFileSync('src/components/ui/CustomSelect.tsx', code, 'utf8');
console.log('Updated CustomSelect');
