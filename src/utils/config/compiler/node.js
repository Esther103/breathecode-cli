const path = require('path');
const fs = require('fs');
const prettier = require("prettier");
let Console = require('../../console');
const { node } = require('compile-run');
const { getMatches, cleanStdout } = require('./_utils.js');
const bcActivity = require('../../bcActivity.js');

module.exports = async function({ files, socket }){
    socket.log('compiling',['Compiling...']);

    if( !files || files.length == 0){
      socket.log('compiler-error', [ "No files to compile or build" ]);
      Console.error("No files to compile or build");
      return;
    }

    let entryPath = files.map(f => './'+f.path).find(f => f.indexOf('app.js') > -1);

    const content = fs.readFileSync(entryPath, "utf8");
    const count = getMatches(/prompt\((?:["'`]{1}(.*)["'`]{1})?\)/gm, content);
    let inputs = (count.length == 0) ? [] : await socket.ask(count);

    const lib = fs.readFileSync(path.resolve(__dirname,'./_node_lib.js'), "utf8");

    const resultPromise = node.runSource(`${lib} ${content}`, { stdin: inputs.join('\n') })
        .then(result => {
            socket.clean();
            if(result.exitCode > 0){
              socket.log('compiler-error',[ result.stderr ]);
              bcActivity.error('exercise_error', {
                details: result.stderr,
                framework: null,
                language: 'javascript',
                message: null,
                name: null,
                compiler: 'node'
              });
              console.log(result.stderr);
              Console.error("There was an error");
            }
            else{
              socket.log('compiler-success',[ cleanStdout(result.stdout, count) ]);
              Console.clean();
              console.log(cleanStdout(result.stdout));
            }
            // else if(stats.hasWarnings()) status = 'compiler-warning';
        })
        .catch(err => {
            Console.error(err.message);
            socket.log('compiler-error',[ err.stderr ]);
            return;
        });
};
