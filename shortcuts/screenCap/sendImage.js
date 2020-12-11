const axios = require('axios');

process.argv.forEach(function(val,index,array){
  if(index==2){
    axios.post("http://localhost:4040/upload_screen_cap/"+val)
      .then(response => {
	console.log("success");
      })
      .catch(error => {
	console.log(error);
      });
  }
})
