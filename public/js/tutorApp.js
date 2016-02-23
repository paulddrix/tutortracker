(function(){
	console.log("tutorApp loaded *****");

	//document.getElementById("wrapper").style.backgroundColor = "red";
	// ACTIVE NAV
	var nav = document.getElementsByTagName("NAV");
  var anchor = nav[0]['children'];
      current = window.location.pathname.split('/')[1];
      for (var i = 0; i < anchor.length; i++) {
      if(anchor[i].href.split('/')[3] == current) {
          anchor[i].className = "activeNav";
      }
			else{
				anchor[i].className = "";
			}
  }
	//Dashboard page
	if (document.getElementById('searchCourses')) {
		//search course when user clicks button
		document.getElementById('searchCourses').addEventListener('click',function() {

			var searchQuery = document.getElementById('courseName').value;
			//check if the user entered a value
			if (searchQuery != "" && searchQuery != undefined ) {
				var xhttp;
			  xhttp = new XMLHttpRequest();
			  xhttp.onreadystatechange = function() {
			    if (xhttp.readyState == 4 && xhttp.status == 200) {
						console.log(xhttp);
						var response = JSON.parse(xhttp.responseText);
						var resultsHtml ='<div class="listCont">';
						for (var i = 0; i < response.length; i++) {
						resultsHtml+= "<div class=\"userLi\"><b>Name</b>&nbsp;"+response[i]['firstName']+" "+ response[i]['lastName'] +" "+ " <b>Total Hours </b>" +response[i]['monthlyTotalHours'] +"<button class=\"dynamicAssign\" data-tutor-name=\""+response[i]['firstName']+" "+response[i]['lastName']+ "\" data-tutor-id=\""+response[i]['userId']+ " \">Assign</button></div>";
						}
						resultsHtml+= "</div>";

			      document.getElementById("courseSearchRes").innerHTML =resultsHtml;
						//array of button element iwht the dynamicAssign class
						var dynamicButtons = document.getElementsByClassName('dynamicAssign');
						//for loop to assign click event listener to each button
						for (var i = 0; i < dynamicButtons.length; i++) {
							dynamicButtons[i].addEventListener('click',function() {
								var tutorName = this.getAttribute("data-tutor-name");
								var tutorId = this.getAttribute("data-tutor-id");
								console.log(document.getElementsByClassName("assignTutor"));
								document.getElementsByClassName("assignTutor").assignTutor.value =tutorId;
							});
						}
						// document.getElementsByClassName('dynamicAssign').addEventListener('click',function() {
						// 	var tutorName = this.getAttribute("data-tutor-name");
						// 	var tutorId = this.getAttribute("data-tutor-id");
						// 	document.getElementsByClassName("assignTutor").assignTutor[0].innerHTML =tutorName;
						// 	document.getElementsByClassName("assignTutor").assignTutor[0].value =tutorId;
						// });
			    }
			  };
			  xhttp.open("GET", "/tutoreligibility/"+searchQuery, true);
			  xhttp.send();
			}
		});
	}
	//Re-assign page
	if (document.getElementById('searchCourses2')) {
		//search course when user clicks button
		document.getElementById('searchCourses2').addEventListener('click',function() {

			var searchQuery = document.getElementById('courseName2').value;
			//check if the user entered a value
			if (searchQuery != "" && searchQuery != undefined ) {
				var xhttp2;
			  xhttp2 = new XMLHttpRequest();
			  xhttp2.onreadystatechange = function() {
			    if (xhttp2.readyState == 4 && xhttp2.status == 200) {
						console.log(xhttp2);
						var rejectedReqId = document.getElementById('rejectedReqId').value;
						var response = JSON.parse(xhttp2.responseText);
						var resultsHtml ='<div class="listCont">';
						for (var i = 0; i < response.length; i++) {
							resultsHtml+= "<div class=\"userLi\"><b>Name</b>&nbsp;"+response[i]['firstName']+" "+ response[i]['lastName'] +" "+ " <b>Total Hours </b>" +response[i]['monthlyTotalHours'] +"<a class=\"aquarius button\" href=\"/reassigntutor/"+ response[i]['userId']+ "/" + rejectedReqId +"\">Assign</a></div>";
						}
						resultsHtml+= "</div>";
						//place the results from the ajax call into the container
			      document.getElementById("courseSearchRes2").innerHTML =resultsHtml;
						//what happens when the user clicks the assign button
						
			    }
			  };
			  xhttp2.open("GET", "/tutoreligibility/"+searchQuery, true);
			  xhttp2.send();
			}
		});
	}


})();
