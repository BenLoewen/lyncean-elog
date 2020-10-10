
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

process.argv.forEach(function(val,index,array){
  if(index==2){
    toSend = {"path":val}
    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "http://localhost:4000/new-image", toSend);
    xhttp.send();
  }
});
