var map;
var geocoder;

var counter=0;
var htmlCounter=0;
var placeAndLodge= new Array();
var placeAndDistance = new Array();

//T秒sleepする
function Sleep( T ){ 
	var d1 = new Date().getTime(); 
	var d2 = new Date().getTime(); 
	while( d2 < d1+1000*T ){    
		d2 = new Date().getTime(); 
	} 
	return; 
} 

function initialize() {
	var opts = {
		center: new google.maps.LatLng(35.014638,135.747499),
		zoom: 3
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), opts);
	geocoder = new google.maps.Geocoder();
}

//テキストボックスの値を取得
function read(){
	var place = document.querySelectorAll('.place');
	var lodge = document.getElementById('lodge').value;
	
	if(lodge == ""){
		alert("宿泊地を入力してください");
	}

	placeAndLodge.push(lodge);
	for (var i = 0; i < place.length; i++) {
		if(place[i].value != "") placeAndLodge.push(place[i].value);
	}	
	calculateDistance();
}

//距離を計算
function calculateDistance(){
	var origin=[];
	var destination=[];

	origin.push(placeAndLodge[counter]);

	for(var i = counter+1; i < placeAndLodge.length; i++){
		destination.push(placeAndLodge[i]);
	}

	var service = new google.maps.DistanceMatrixService();
	service.getDistanceMatrix({
		origins:origin,
		destinations:destination,
		travelMode: google.maps.TravelMode.DRIVING,
		unitSystem: google.maps.UnitSystem.METRIC,
		avoidHighways: false,
		avoidTolls: false
	}, callback); 
}

//距離を配列に格納
function callback(response, status) {
	if(status == google.maps.DistanceMatrixStatus.OVER_QUERY_LIMIT){
		Sleep(0.1);
		calculateDistance();
	}
	else {
		var results = response.rows[0].elements;
		for (var i = 0; i < results.length; i++) {
			var origins = placeAndLodge[counter];
			var destinations = placeAndLodge[counter+1+i];
			var element = results[i];
			placeAndDistance.push([origins, destinations, element.duration.value / 3600]);
		}
		if(counter < placeAndLodge.length-2){
			counter++;
			calculateDistance();
		}
		else{
			createHamiltonianCycle();
		}
	}
}

function createHamiltonianCycle(){
	placeAndLodge.push(placeAndLodge[0]);	
	//a, b,...,c,d,...a においてa,c,...,b,d,...aに繋ぎ変えた方が得なら繋ぎかえる
	for(var i = 0; i < placeAndLodge.length-3; i++){
		var a = placeAndLodge[i];
		var b = placeAndLodge[i+1];

		for(var j = i+2; j < placeAndLodge.length-1; j++){
			var c = placeAndLodge[j];
			var d = placeAndLodge[j+1];

			for(var k = 0; k < placeAndDistance.length; k++){
				if(placeAndDistance[k].indexOf(a) > -1 && placeAndDistance[k].indexOf(b)> -1){
					var weightOfAB = placeAndDistance[k][2];		
				}
				if(placeAndDistance[k].indexOf(c) > -1 && placeAndDistance[k].indexOf(d)> -1){
					var weightOfCD = placeAndDistance[k][2];		
				}
				if(placeAndDistance[k].indexOf(a) > -1 && placeAndDistance[k].indexOf(c)> -1){
					var weightOfAC = placeAndDistance[k][2];		
				}
				if(placeAndDistance[k].indexOf(b) > -1 && placeAndDistance[k].indexOf(d)> -1){
					var weightOfBD = placeAndDistance[k][2];		
				}
			}
			if(weightOfAB + weightOfCD > weightOfAC + weightOfBD){
				var newArray = new Array();

				for(k = 0; k < i; k++){
					newArray.push(placeAndLodge[k]);
				}
				newArray.push(a);//i
				newArray.push(c);//j
				for(k = j-1; k > i; k--){
					newArray.push(placeAndLodge[k]);
				}
				for(k = j+1; k < placeAndLodge.length; k++){
					newArray.push(placeAndLodge[k]);
				}
				placeAndLodge = newArray;
				i = -1;
				break;
			}
		}
	}
	drawMap();
}

function drawMap(){
	var waypoints = new Array();
	for(var i = 1; i < placeAndLodge.length-1; i++){
		waypoints.push({ location:placeAndLodge[i], stopover:true });
	}

	var directionsService = new google.maps.DirectionsService;
	var directionsDisplay = new google.maps.DirectionsRenderer;
	directionsDisplay.setMap(map);
	directionsDisplay.setPanel(document.getElementById('directions-panel'));

	var request = {
		origin: placeAndLodge[0],
		destination: placeAndLodge[0],
		waypoints: waypoints,
		optimizeWaypoints: true,
		travelMode: google.maps.TravelMode.DRIVING
	};

	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections( response );
		}
	});	
}

function AddTableRows(){
	htmlCounter++;
	$('ul').append('\
	<li>\
	<input class="place form-control" type="text" placeholder="観光地" value="">\
	</li>\
	');
}

function deleteTextbox(){
	if(htmlCounter > 0 ) $('li:last').remove();
	htmlCounter--;
}

google.maps.event.addDomListener(window, 'load', initialize);