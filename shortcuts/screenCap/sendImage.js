const axios = require('axios');

process.argv.forEach(function(val,index,array){
  if(index==2){
    axios.get("http://localhost:4040/"+val)
      .then(response => {
	console.log("success");
      })
      .catch(error => {
	console.log(error);
      });
  }
})
