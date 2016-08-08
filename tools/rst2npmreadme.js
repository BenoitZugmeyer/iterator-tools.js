/*
 * This quite ugly script is here to transform my ReStructuredText readme to a format acceptable to
 * NPM.  NPM accepts only Markdown files, which would be fine if Markdown wasn't so limited in its
 * format.  For example, I use code sample nested in list definition. Well, Markdown does not
 * support this.  Luckily, the library NPM is using to convert Markdown to HTML is quite permissive,
 * and this script does the job for it.
 */
/*eslint no-console: 0*/
/*eslint-env node*/

"use strict";

const fs = require("fs");
const spawn = require("child_process").spawn;
const joinPath = require("path").join;
const trumpet = require("trumpet");
const marky = require("marky-markdown");
const htmlEntities = require("html-entities");

const entities = new htmlEntities.AllHtmlEntities();

function path(p) {
  return joinPath(__dirname, "..", ...p.split("/"));
}

function readAll(stream) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    stream.on("error", reject);
    stream.on("data", (data) => buffers.push(data));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
  });
}

function errorHandler(e) {
  console.error(e.stack || e.message || e);
}

const command = process.env.RST2HTML || "rst2html";
const rst2html = spawn(command, [
  "--initial-header-level=2",
  "--syntax-highlight=none",
  path("README.rst"),
]);

const tr = trumpet();

tr.selectAll("pre.code", (elem) => {
  const stream = elem.createStream({ outer: true });
  const language = elem.getAttribute("class").match(/code\s*(\w*)/)[1];
  const inner = trumpet();
  stream.pipe(inner);
  readAll(inner.select("pre").createReadStream())
  .then((code) => stream.end(marky(`\`\`\`${language}${entities.decode(code.toString())}\`\`\``).html()))
  .catch(errorHandler);
});

tr.select(".document").createReadStream().pipe(fs.createWriteStream(path("README.md")));
rst2html.stdout.pipe(tr);

const errorBuffers = [];
rst2html.stderr.on("data", (data) => errorBuffers.push(data));

rst2html.on("close", (code) => {
  if (code) {
    console.log(Buffer.concat(errorBuffers).toString());
    console.log(`${command} excited with code ${code}`);
  }
});
