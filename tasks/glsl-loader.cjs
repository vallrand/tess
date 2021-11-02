module.exports = function(source){
    let code = `module.exports=${JSON.stringify(source)};`
    code = code.replace(/ +(?= )/g,'').replace(/^\s*[\r\n]/gm, '')
    code = code.replace(/#pragma import\((.*?)\)/ig, (line, path) => `"+require("${path}")+"`)
    return code
}