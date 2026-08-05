const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const code = fs.readFileSync('mobile/src/app/index.tsx', 'utf-8');
const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'],
});

traverse(ast, {
  CallExpression(path) {
    if (path.node.callee.type === 'Identifier' && path.node.callee.name.startsWith('set')) {
      // Check if it is inside an arrow function, function declaration, or class method
      let isInsideCallback = false;
      let currentPath = path.parentPath;
      while (currentPath) {
        if (
          currentPath.node.type === 'ArrowFunctionExpression' ||
          currentPath.node.type === 'FunctionDeclaration' ||
          currentPath.node.type === 'FunctionExpression' ||
          currentPath.node.type === 'ClassMethod'
        ) {
          // If the function is the root App component, we shouldn't count it as a callback
          if (currentPath.node.id && currentPath.node.id.name === 'App') {
            // It's inside App, but not inside another function
          } else if (currentPath.node.id && currentPath.node.id.name === 'AIGeneratingScreen') {
            // It's inside AIGeneratingScreen
          } else if (currentPath.node.id && currentPath.node.id.name === 'SmallBgGenIndicator') {
          } else {
            isInsideCallback = true;
          }
        }
        currentPath = currentPath.parentPath;
      }

      if (!isInsideCallback) {
        console.log(`Found direct state setter call at line ${path.node.loc.start.line}: ${path.node.callee.name}`);
      }
    }
  }
});
