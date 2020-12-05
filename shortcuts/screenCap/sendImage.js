import $ from "jquery";

process.argv.forEach(function(val,index,array){
  if(index==2){
    toSend = {"name":val}
    $.ajax({
      type: "POST",
      url: "/screen_cap",
      dataType: "json",
      contentType: "application/json; charset=utf-8",
      data: JSON.stringify(toSend),s
      success: function(result){
        console.log("success")
      },
      error: function(request, status, error){
        console.log("Failure. Server is probably not running")
      }s
    }
  }
});
