import fs from 'node:fs';
import ts from 'typescript';
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ESNext}}).outputText;
const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const planURL=data(compile('src/lib/day-plan.ts'));
export const plan=await import(planURL);
export const adjustments=await import(data(compile('src/lib/day-adjustments.ts').replace("'./day-plan'",JSON.stringify(planURL))));
