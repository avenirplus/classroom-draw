import { mkdir, rm, copyFile } from "node:fs/promises";
const files=["index.html","style.css","app.js","manual.html","my-hub.json","404.html"];
await rm("public",{recursive:true,force:true});
await mkdir("public",{recursive:true});
for(const file of files) await copyFile(file,`public/${file}`);
console.log("Built public/ with",files.length,"files");
