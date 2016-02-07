'use strict';

// Require Logic
var <%=moduleName%> = require('<%=entryPointFilePath%>');

// Lambda Handler
module.exports.handler = function(event, context) {

  var response = <%=entryPointCode%>(
    <% for (var argName in entryPointArgNames) { print argName + ', \n'; } %>
  );
  return context.done(error, response);
};