import * as fs from 'fs';
import * as path from 'path';

const colorMap: Record<string, string> = {
  'blue-600': 'red-700',
  'blue-500': 'red-600',
  'blue-700': 'red-800',
  'blue-800': 'red-900',
  'blue-400': 'red-500',
  'blue-300': 'red-400',
  'blue-200': 'red-300',
  'blue-100': 'red-100',
  'blue-50': 'red-50',
  'blue-900': 'red-950'
};

function replaceInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  for (const [blue, red] of Object.entries(colorMap)) {
    const regex = new RegExp(blue, 'g');
    newContent = newContent.replace(regex, red);
  }
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir('./src');
