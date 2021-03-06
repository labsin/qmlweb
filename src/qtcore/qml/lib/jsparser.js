(function() {
  var UglifyJS;
  if (typeof window === 'undefined') {
    UglifyJS = require('../../../uglify/node.js');
  }
  else {
    UglifyJS = this;
  }

  global.jsparse = function (source) {
    var AST_Tree = UglifyJS.parse(source);
    var obj = { exports: [], source: source };

    for (var i = 0 ; i < AST_Tree.body.length ; ++i) {
      var element = AST_Tree.body[i];

      switch (element.__proto__.TYPE) {
        case "VAR":
          obj.exports.push(element.definitions[0].name.name);
          break ;
        case "Defun":
          obj.exports.push(element.name.name);
          break ;
      }
    }
    return obj;
  }

})();
