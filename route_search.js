//宿泊地+観光地>9の場合UNKNOWN ERRORになってしまうバグ修正

var map;
var geocoder;
var directionsDisplay = new Array();
var directionsService;

var counter=0;
var dayCounter=0;
var htmlCounter=0;
var htmlCounter2=0;
var placeAndTime=new Array();
var placeAndDistance=new Array();
var lodgeAndDistance=new Array();
var hogeArray=new Array();
var lodgeArray=new Array();

//T秒sleepする
function Sleep( T ){ 
	var d1 = new Date().getTime(); 
	var d2 = new Date().getTime(); 
	while( d2 < d1+1000*T ){    
		d2=new Date().getTime(); 
	} 
	return; 
} 

//array1とarray2が同じか、部分集合か調べる
function same(array1,array2){
	//array1,array2:[address,address,...]
	if(array1.length==0 && array2.length==0){
		return 0;
	}
	if(array1.length==0){
		return 2;
	}
	if(array2.length==0){
		return 1;
	}
	array1.sort();
	array2.sort();
	//同じ
	if( ("," + array1.join()+ ",").match("," +array2+ ",") &&
			("," + array2.join()+ ",").match("," +array1+ ",")){
		return 0;
	}
	//array1にarray2が含まれる
	for(var i=0;i< array2.length;i++){
		if(!("," + array1.join() + ",").match("," +array2[i]+ ",")){
			break;
		}
		else if(i==array2.length-1){
			return 1;
		}
	}
	//array2にarray1が含まれる
	for(var i=0;i< array1.length;i++){
		if(!("," + array2.join() + ",").match("," +array1[i]+ ",")){
			break;
		}
		else if(i==array1.length-1){
			return 2;
		}
	}
	return -1;
}

//start,end,array=[name,name,...]を受け取ったらパスstart-array-endの重みを返す
function hamilton(start,end,array){
	array.unshift(start);
	if($.inArray(start,array,1) > -1){
		array.splice($.inArray(start,array,1),1);
	}
	array.unshift(end);
	if($.inArray(end,array,1) > -1){
		array.splice($.inArray(end,array,1),1);
	}
	if(start!=end){
		array.push(end);
		array.shift();
	}
	
	var sum=0;
	var weight=0;
	
	if(array.length>1){
		if(array.length>3){
			//ハミルトン閉路に要素を並べ替える
			for(var i=0;i<array.length;i++){
				if((array[i]==start && array[(i+1)%array.length]==end) ||
					(array[i]==end && array[(i+1)%array.length]==start)){
					continue;
				}
				for(var j=i+2;j<array.length;j++){
					if((array[j]==start && array[(j+1)%array.length]==end) ||
						(array[j]==end && array[(j+1)%array.length]==start)){
						continue;
					}
					var oldSum=0;
					var newSum=0;
					for(var k=0;k<placeAndDistance.length;k++){
						if(($.inArray(array[i],placeAndDistance[k])>-1 &&
							$.inArray(array[(i+1)%array.length],placeAndDistance[k])>-1)||
							($.inArray(array[j],placeAndDistance[k])>-1 &&
							$.inArray(array[(j+1)%array.length],placeAndDistance[k])>-1)){
							oldSum+=placeAndDistance[k][2];
						}
						if(($.inArray(array[i],placeAndDistance[k])>-1 &&
							$.inArray(array[j],placeAndDistance[k])>-1)||
							($.inArray(array[(i+1)%array.length],placeAndDistance[k])>-1 &&
							$.inArray(array[(j+1)%array.length],placeAndDistance[k])>-1)){
							newSum+=placeAndDistance[k][2];
						}
					}//k
					if(newSum < oldSum){
						var length=array.length;
						for(var k=0; k<=i;k++){
							array.push(array[k]);
						}
						for(var k=j; k>=i+1;k--){
							array.push(array[k]);
						}
						for(var k=j+1; k<length;k++){
							array.push(array[k]);
						}
						array.splice(0,length);
						i=-1;
						break;
					}
				}//j
			}//i
		}//if
		for(var i=0;i<array.length;i++){
			for(var j=0;j<placeAndDistance.length;j++){
				if((placeAndDistance[j][0]==array[i] && placeAndDistance[j][1]==array[(i+1)%array.length]) ||
				(placeAndDistance[j][1]==array[i] && placeAndDistance[j][0]==array[(i+1)%array.length])){
					sum+=placeAndDistance[j][3];
				}
				if((placeAndDistance[j][0]==start && placeAndDistance[j][1]==end) ||
					(placeAndDistance[j][1]==start && placeAndDistance[j][0]==end)){
					weight=placeAndDistance[j][2];				
				}
			}//j
		}//i
	}	
	return sum-weight;
}

//****************************************************************
//初期化
function initialize() {
	var opts = {
			center: new google.maps.LatLng(35.014638,135.747499),
			zoom: 3
	};
	map = new google.maps.Map(document.getElementById('map-canvas'), opts);
	geocoder = new google.maps.Geocoder();
	
	var table1 = document.getElementById("table1");
	var table2 = document.getElementById("table2");
	var autocomplete1 = new google.maps.places.Autocomplete(table1.rows[0].cells[0].firstChild);
	autocomplete1.bindTo('bounds', map);
	var autocomplete2 = new google.maps.places.Autocomplete(table2.rows[0].cells[0].firstChild);
	autocomplete2.bindTo('bounds', map);
}

//テキストボックスの中身を読み込む
function read(){
	//初期化
	for(var i=0;i< hogeArray.length ;i++){
		directionsDisplay[i].setMap(null);
		directionsDisplay[i].setPanel(null);
	}
	
	counter=0;
	dayCounter=0;
	placeAndTime=new Array();
	placeAndDistance=new Array();
	lodgeAndDistance=new Array();
	hogeArray=new Array();
	lodgeArray=new Array();
	
	var table1 = document.getElementById("table1");
	var table2 = document.getElementById("table2");
	var dayTime = document.getElementById('dayTime');
	
	if(dayTime.value.length==0){
		alert("活動時間を入力してください");
	}
	if(table2.rows[0].cells[0].firstChild.value.length==0){
		alert("宿泊地を入力してください");
	}
	//row:行　cell:列
	for (var i = 0; i < table1.rows.length; i++) {
		var value1 = table1.rows[i].cells[0].firstChild.value;
		var value2 = table1.rows[i].cells[1].firstChild.value;
		if(value1.length!=0){
			placeAndTime.push([value1,parseFloat(value2)]);
		}
	}
	for (var i = 0; i < table2.rows.length; i++) {
		var value3 = table2.rows[i].cells[0].firstChild.value;
		if(value3.length!=0){
			lodgeArray.push([value3]);
			placeAndTime.unshift([value3,0]);
		}
	}
	calculateDistance();
}

//距離を計算
function calculateDistance(){
	var origin=[];
	var destination=[];
	origin.push(placeAndTime[counter][0]);
	for(var i=counter+1;i< placeAndTime.length;i++){
		destination.push(placeAndTime[i][0]);
	}
	var service = new google.maps.DistanceMatrixService();
	service.getDistanceMatrix(
			{
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
	if(status==google.maps.DistanceMatrixStatus.OVER_QUERY_LIMIT){
		Sleep(0.1);
		calculateDistance();
	}
	else if (status != google.maps.DistanceMatrixStatus.OK) {
		alert('Error was: ' + status);
	} 
	else {
		var origins = response.originAddresses;
		var destinations = response.destinationAddresses;

		for (var i = 0; i < origins.length; i++) {
			var results = response.rows[i].elements;
			for (var j = 0; j < results.length; j++) {
				var element = results[j];
				var sum1=element.duration.value/3600+(placeAndTime[counter][1])/2+(placeAndTime[counter+j+1][1])/2;
				if(counter<lodgeArray.length){
					lodgeAndDistance[lodgeAndDistance.length]=
						[origins[i],destinations[j],element.duration.value/3600,sum1,'<br>'];
				}
				else{
					placeAndDistance[placeAndDistance.length]=
						[origins[i],destinations[j],element.duration.value/3600,sum1,'<br>'];
				}
			}
		}

		if(counter < placeAndTime.length-2){
			counter++;
			calculateDistance();
		}
		else{
			for(var i = 0; i < lodgeArray.length-1; i++){
				lodgeArray[i]=lodgeAndDistance[lodgeArray.length-2-i][1];
			}
			lodgeArray[lodgeArray.length-1]=lodgeAndDistance[0][0];
			if(placeAndDistance.length==0){
				hogeArray[0]=[lodgeAndDistance[lodgeAndDistance.length-1][1]];
				matching();
			}
			else{
				partition();
			}
		}
	}//else
}

//同じ日に観光できるか判定
function partition(){
	var dayTime = parseFloat(document.getElementById('dayTime').value);
	//この関数内で初めてhogeArrayが作られる
	//全ての要素からなる集合を作る
	hogeArray[0]=[placeAndDistance[0][0]];
	for(var i=0;i< placeAndTime.length-lodgeArray.length-1;i++){
		hogeArray[0].push(placeAndDistance[i][1]);
	}
	for(var i=0;i< placeAndDistance.length;i++){
		var element1=placeAndDistance[i][0];
		var element2=placeAndDistance[i][1];
		//同じ集合に入れられないならば分割
		if(placeAndDistance[i][3] > dayTime/2 ){
			for(var j=0;j< hogeArray.length;j++){
				var value1=$.inArray(element1, hogeArray[j]);
				var value2=$.inArray(element2, hogeArray[j]);
				if(value1 >=0 && value2 >=0){
					var damy1=$.extend(true, [], hogeArray[j]);
					var damy2=$.extend(true, [], hogeArray[j]);
					damy1.splice(value1,1);
					damy2.splice(value2,1);
					hogeArray.push(damy1);
					hogeArray.push(damy2);
					hogeArray.splice(j,1);
					j--;
				}
			}//j
			//重複する集合を除去する
			for(var j=0;j< hogeArray.length;j++){
				for(var k=0;k< hogeArray.length;k++){
					var compare=same(hogeArray[j],hogeArray[k]);
					//hogeArray[j]にhogeArray[k]が含まれるか同じ
					if( (compare==0 || compare==1) && j!=k){
						hogeArray.splice(k,1);
						k--;
					}
				}//k
			}//j
		}
	}//i
	divideArray();
}

function divideArray(){
	var restArray=$.extend(true, [], hogeArray);
	var decideArray=[];
	//重複なしの集合を作成	
	while(restArray.length>0){	
		//集合を要素が多い順にソート
		for(var i=0;i< restArray.length;i++){
			restArray[i].unshift(restArray[i].length);
		}
		restArray.sort(function(a,b){return(b[0] -a[0]);});
		for(var i=0;i< restArray.length;i++){
			restArray[i].shift();
		}	

		var cnt=0;
		for(var i=0;i< restArray[0].length;i++){
			for(var j=1;j<restArray.length;j++){
				if($.inArray(restArray[0][i], restArray[j])>=0){
					cnt++;
					break;
				}
			}//j
		}//i
		
		//restArray[0]の要素が全て他の集合に含まれる時
		//restArray[0]を除去する
		if(cnt==restArray[0].length){
			restArray.shift();
		}
		else{
			for(var i=0;i< restArray[0].length;i++){
				for(var j=1;j<restArray.length;j++){
					//restArray[0]の要素がrestArray[j]に含まれる時
					//restArray[j]からその要素を除去
					if($.inArray(restArray[0][i], restArray[j])>=0){
						restArray[j].splice($.inArray(restArray[0][i], restArray[j]),1);
					}
					if(restArray[j].length==0){
						restArray.splice(j,1);
						j--;
					}
				}//j
			}//i
			decideArray.push(restArray[0]);
			restArray.shift();			
		}
	}//while	
	hogeArray=decideArray;

	gain(hogeArray.length)
}

function gain(day){
	var breakflag=0;
	var from=0;
	var to=0;
	var element=0;
	
	while(breakflag==0 ){
		var minCost=Infinity;
		//hogeArray[i]:移動元集合
		for(var i=0; i< hogeArray.length; i++){
			//移動元集合が空ならばスキップ
			if(hogeArray[i].length==0){//
				continue;
			}
			//hogeArray[i][j]:移動を考える点
			for(var j=0; j< hogeArray[i].length; j++){
				var fromCost=0;
				//移動元集合の要素が2個以上ある時
				//移動元集合の要素が1個の場合のfromCostは0
				if(hogeArray[i].length>1){
					for(var k=0;k< placeAndDistance.length;k++){
						//fromCost:hogeArray[i][j]と同じ集合の点間のコストの合計
						if( (hogeArray[i][j]==placeAndDistance[k][0] && $.inArray(placeAndDistance[k][1],hogeArray[i])>-1) ||
							(hogeArray[i][j]==placeAndDistance[k][1] && $.inArray(placeAndDistance[k][0],hogeArray[i])>-1) ){
							fromCost+=placeAndDistance[k][2];
						}
					}//k
					fromCost=fromCost/(hogeArray[i].length-1);
				}
				//hogeArray[k]:移動先集合
				for(var k=0; k< hogeArray.length; k++){
					if(i!=k){//
						var toCost=0;
						//移動先の集合が空でない時
						//移動先の集合が空ならばtoCostは0
						if(hogeArray[k].length>0){
							for(var l=0;l< placeAndDistance.length;l++){							
								if( (hogeArray[i][j]==placeAndDistance[l][0] && $.inArray(placeAndDistance[l][1],hogeArray[k])>-1) ||
									(hogeArray[i][j]==placeAndDistance[l][1] && $.inArray(placeAndDistance[l][0],hogeArray[k])>-1) ){
									toCost+=placeAndDistance[l][2];
								}	    
							}//l
							toCost=toCost/hogeArray[k].length;
						}

						if( (toCost-fromCost) < minCost){
							minCost=toCost-fromCost;
							from=i;
							to=k;
							element=j;
						}
					}
				}//k	
			}//j
		}//i
		
		if(minCost > 0){
			breakflag=1;
		}

		if(breakflag==0){		
			hogeArray[to].push(hogeArray[from][element]);
			hogeArray[from].splice(element,1);
		}
	}//while
	control();
}

function control(){
	var sum1=0;
	var sum2=0;
	var overIndex=-1;
	var min=Infinity;
	var to=0;
	var element=0;
	var dayTime = parseFloat(document.getElementById('dayTime').value);
	for(var i=0; i< hogeArray.length; i++){
		sum1=hamilton(hogeArray[i][0],hogeArray[i][0],hogeArray[i]);	
		//google map のwaypointは8個までしか表示できない
		//しかし7~8でも表示されないケースがある...?
		if(sum1> dayTime || hogeArray[i].length>7){
			overIndex=i;
			break;
		}
	}
	if(overIndex==-1){
		matching();
	}
	else{
		//hogeArray[overIndex]の要素の中で最もましな移動をするものを探す
		for(var i=0; i< hogeArray[overIndex].length; i++){
			for(var j=0; j< hogeArray.length; j++){
				if(overIndex!=j){
					var damy=$.extend(true, [], hogeArray[j]);
					damy.push(hogeArray[overIndex][i]);
					sum1=hamilton(damy[0],damy[0],damy);			
					sum2=0;
					for(var k=0;k< placeAndDistance.length;k++){
						if( (hogeArray[overIndex][i]==placeAndDistance[k][0] &&
							$.inArray(placeAndDistance[k][1],hogeArray[j])>-1) ||
							(hogeArray[overIndex][i]==placeAndDistance[k][1] &&
							$.inArray(placeAndDistance[k][0],hogeArray[j])>-1)){
							sum2+=placeAndDistance[k][2];
						}
					}//k
					sum2=sum2/hogeArray[j].length;
					if(min>sum2 && sum1 <dayTime && damy.length <8){
						min=sum2;
						to=j;
						element=i;			
					}			
				}//if
			}//j
		}//i
		if(min==Infinity){
			hogeArray.splice(overIndex+1, 0, [hogeArray[overIndex][0]]);
			hogeArray[overIndex].shift();
			gain(hogeArray.length);
		}
		else{
			hogeArray[to].push(hogeArray[overIndex][element]);
			hogeArray[overIndex].splice(element,1);
			control();
		}
	}//else	
}

//宿泊地と集合を対応させる
function matching(){
	if(lodgeArray.length==1){
		for(var i=0;i<hogeArray.length;i++){
			hogeArray[i].push(lodgeArray[0]);
			hogeArray[i].unshift(lodgeArray[0]);
		}
	}
	else{
		for(var i=0;i<hogeArray.length;i++){
			var minValue=Infinity;
			var minIndex=0;
			for(var j=0;j<lodgeArray.length;j++){
				var sum=0;
				for(var k=0;k<lodgeAndDistance.length;k++){
					if(($.inArray(lodgeAndDistance[k][1],hogeArray[i])>-1 && lodgeAndDistance[k][0]==lodgeArray[j])){
						sum+=lodgeAndDistance[k][2];
					}
				}//k
				if(sum<minValue){
					minIndex=j;
					minValue=sum;
				}
			}//j
			hogeArray[i].push(lodgeArray[minIndex]);
			hogeArray[i].unshift(lodgeArray[minIndex]);
		}//i
	}
	createPath();
}

//パスにしたほうが得ならばパスにする
function createPath(){
	var candidateArray=[];
	var decidedArray=[];
	var bondArray=placeAndDistance.concat(lodgeAndDistance);
	
	//この段階でhogeArray[i]はlodge-places-lodge(lodgeは同じ)
	for(var i=0;i<hogeArray.length;i++){
		for(var j=0;j<lodgeArray.length;j++){
			if(hogeArray[i][0] != lodgeArray[j]){
				var damy=$.extend(true, [], hogeArray[i]);
				for(var k=0;k<bondArray.length;k++){
					if(bondArray[k][0]==lodgeArray[j]&&bondArray[k][1]==hogeArray[i][0]||
					   bondArray[k][1]==lodgeArray[j]&&bondArray[k][0]==hogeArray[i][0]){
						var a=bondArray[k][2];
					}
					if(bondArray[k][0]==hogeArray[i][0]&&bondArray[k][1]==hogeArray[i][1]||
					   bondArray[k][1]==hogeArray[i][0]&&bondArray[k][0]==hogeArray[i][1]){
						var b=bondArray[k][2];
					}
					if(bondArray[k][0]==lodgeArray[j]&&bondArray[k][1]==hogeArray[i][hogeArray[i].length-2]||
					   bondArray[k][1]==lodgeArray[j]&&bondArray[k][0]==hogeArray[i][hogeArray[i].length-2]){
						var c=bondArray[k][2];
					}
				}
				var sortArray=[['ab',Math.abs(a-b)],['bc',Math.abs(b-c)],['ca',Math.abs(c-a)]];
				sortArray=sortArray.sort(function(a,b){return(a[1] - b[1]);});
				if(sortArray[0][0]=='bc'){
					candidateArray.push([sortArray[0][1],i,j,'<br>']);
				}
			}
		}//j
	}//i
	candidateArray=candidateArray.sort(function(a,b){return(a[0] - b[0]);});
	while(candidateArray.length>0){
		decidedArray=candidateArray[0];
		candidateArray.shift();
		//同じ集合からなるパスを削除
		for(var i=0;i<candidateArray.length;i++){
			if(candidateArray[i][1]==decidedArray[1]){
				candidateArray.splice(i,1);
				i--;
			}
		}//i
		//端点が同じパスを削除
		for(var i=0;i<candidateArray.length;i++){
			var a=hogeArray[decidedArray[1]][0];
			var b=lodgeArray[decidedArray[2]];
			var c=hogeArray[candidateArray[i][1]][0];
			var d=lodgeArray[candidateArray[i][2]];
			if((a==c && b==d)||(a==d && b==c)){
				candidateArray.splice(i,1);
				i--;
			}
		}//i
		hogeArray[decidedArray[1]].pop();
		hogeArray[decidedArray[1]].push(lodgeArray[decidedArray[2]]);
	}
	draw();
}


function draw(){
	var drawcounter=0;
	outputDiv.innerHTML='<font size="3">所要日数:'+hogeArray.length+'日<br></font>';
	for(var i=0; i < hogeArray.length; i++){
		eval("var waypts"+i+"=[];");
		for(var j=1; j < hogeArray[i].length-1; j++){
			eval("waypts"+i+".push({location:hogeArray["+i+"]["+j+"],stopover:true});");
		}
	}

	for( var i = 0; i < hogeArray.length; i++ ){
		directionsDisplay[i] = new google.maps.DirectionsRenderer();
		directionsService = new google.maps.DirectionsService();
		directionsDisplay[i].setMap( map );
		directionsDisplay[i].setPanel(document.getElementById('directions-panel'));
	}
	for(var i=0; i < hogeArray.length; i++){
		var request = {
				origin: hogeArray[i][0],
				destination: hogeArray[i][hogeArray[i].length-1],
				waypoints: eval("waypts"+i),
				optimizeWaypoints: true,
				travelMode: google.maps.TravelMode.DRIVING
		};

		directionsService.route(request, function(response, status) {
			if (status == google.maps.DirectionsStatus.OK) {
				directionsDisplay[drawcounter].setDirections( response );
				drawcounter++;
			}
		});
	}
}

function draw2(){
	var day=dayCounter-1;
	var waypts=[];
	for(var i=1; i < hogeArray[day].length-1; i++){
		waypts.push({location:hogeArray[day][i],stopover:true});
	}
	
	directionsDisplay[0] = new google.maps.DirectionsRenderer();
	directionsDisplay[0].setMap(map);
	directionsDisplay[0].setPanel(document.getElementById('directions-panel'));
	
	var request = {
			origin: hogeArray[day][0],
			destination: hogeArray[day][hogeArray[day].length-1],
			waypoints: waypts,
			optimizeWaypoints: true,
			travelMode: google.maps.TravelMode.DRIVING
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			directionsDisplay[0].setDirections(response);
		}
	}); 
}

function changeDay(){
	dayCounter++;
	for(var i=0;i< hogeArray.length ;i++){
		directionsDisplay[i].setMap(null);
		directionsDisplay[i].setPanel(null);
	}
	if(dayCounter % (hogeArray.length+1)!=0){
		draw2();
	}
	else{
		dayCounter=0;
		draw();
	}
}

function AddTableRows(num){
	if(num==2){
		htmlCounter2++;
		var table2 = document.getElementById("table2");
		var row1 = table2.insertRow(htmlCounter2);
		var cell1 = row1.insertCell(0);
		
		cell1.setAttribute("class","lodge");
		
		cell1.innerHTML = '<input type="text" placeholder="宿泊地" style="border:solid 1px #3cb371; width:95%;">';
		var autocomplete = new google.maps.places.Autocomplete(table2.rows[htmlCounter2].cells[0].firstChild);
		autocomplete.bindTo('bounds', map);
	}
	else{
		htmlCounter++;
		var table1 = document.getElementById("table1");
		var row1 = table1.insertRow(htmlCounter);
		var cell1 = row1.insertCell(0);
		var cell2 = row1.insertCell(1);

		cell1.className = 'waypoints';
		cell2.className = 'time';

		cell1.innerHTML = '<input type="text" placeholder="観光地" style="border:solid 1px #ffa500; width:95%;">';
		cell2.innerHTML = '<input type="text" placeholder="時間" style="border:solid 1px #ffa500; width:95%;">';

		var autocomplete = new google.maps.places.Autocomplete(table1.rows[htmlCounter].cells[0].firstChild);
		autocomplete.bindTo('bounds', map);
	}
}

function deleteTextbox(num){
	if(num==2){
		var table2 = document.getElementById("table2");
		if(htmlCounter2>0){
			table2.deleteRow(htmlCounter2);
			htmlCounter2--;
		}
	}
	else{
		var table1 = document.getElementById("table1");
		if(htmlCounter>0){
			table1.deleteRow(htmlCounter);
			htmlCounter--;
		}
	}
}

function reload(){
window.location.reload();
}
google.maps.event.addDomListener(window, 'load', initialize);