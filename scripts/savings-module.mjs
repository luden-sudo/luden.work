import fs from 'node:fs';
import ts from 'typescript';
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ESNext}}).outputText;
const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const financeURL=url(compile('src/lib/finance.ts'));
export const finance=await import(financeURL);
export const savings=await import(url(compile('src/lib/savings.ts').replace("'./finance'",JSON.stringify(financeURL))));
