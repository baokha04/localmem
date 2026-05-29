import Parser from 'tree-sitter';
import ts from 'tree-sitter-typescript';

export interface CodeChunk {
  type: 'file' | 'class' | 'function';
  content: string;
  metadata: Record<string, any>;
  edges: Array<{ type: string; target: string }>;
}

export class ASTProcessor {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    // Initialize the parser for TypeScript
    // Handle both default export and named export for maximum compatibility
    const lang = (ts as any).typescript || ts;
    this.parser.setLanguage(lang);
  }

  public parseAndChunk(filePath: string, sourceCode: string, projectName: string): CodeChunk[] {
    const tree = this.parser.parse(sourceCode);
    const chunks: CodeChunk[] = [];
    
    // 1. File-level chunk (Save header, imports, config)
    chunks.push({
      type: 'file',
      content: sourceCode.substring(0, 2000), // Abbreviated to save tokens
      metadata: { file: filePath, project: projectName, tags: ['file-level'] },
      edges: [] // Will add IMPORT edges here after analyzing imports if necessary
    });

    // 2. Traverse AST to find Class and Function
    const traverse = (node: Parser.SyntaxNode) => {
      // Chunking at Class level
      if (node.type === 'class_declaration') {
        const className = node.childForFieldName('name')?.text || 'Anonymous';
        chunks.push({
          type: 'class',
          content: node.text,
          metadata: { file: filePath, class: className, project: projectName },
          edges: []
        });
      }

      // Chunking at Function / Method level
      if (
        node.type === 'function_declaration' || 
        node.type === 'method_definition' || 
        node.type === 'arrow_function'
      ) {
        const funcName = node.childForFieldName('name')?.text || 'Anonymous';
        
        // Detect Edges: Does this function call other functions?
        const calls = this.extractFunctionCalls(node);

        chunks.push({
          type: 'function',
          content: node.text,
          metadata: { file: filePath, function: funcName, project: projectName },
          edges: calls.map(call => ({ type: 'CALLS', target: call }))
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(tree.rootNode);
    return chunks;
  }

  private extractFunctionCalls(node: Parser.SyntaxNode): string[] {
    const calls: string[] = [];
    const findCalls = (n: Parser.SyntaxNode) => {
      if (n.type === 'call_expression') {
        const funcNode = n.childForFieldName('function');
        const funcName = funcNode?.text;
        if (funcName) {
          // Extract only the function name if it is a property access (e.g. obj.method -> method)
          const parts = funcName.split('.');
          const baseName = parts[parts.length - 1];
          calls.push(baseName);
        }
      }
      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (child) {
          findCalls(child);
        }
      }
    };
    findCalls(node);
    return [...new Set(calls)];
  }
}
