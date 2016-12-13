//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/拡張開始_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
function startExtention(){
	//GoogleMap追加
	addGoogleLayers();
	
	//GoogleApi利用開始
	prepareGoogleMapApi();
	
	//アニメーション利用開始
	prepareBounceMarker();
	
	//プロット時間短縮
	setInterval(hoge, 8000);
	
	//フッタ非表示
	hideFooter();
	
	//ボタンサーチを非表示
	$("#area_buttonsearch").hide();

//	//地図ジャンプを非表示
//	$("#button_customcontrol_area").remove();
	
	//出現記録ボタンを小さく
	$("#button_customcontrol_history").css({"height":"20px","width":"80px","fontSize":"50%","padding":"5px"});
	//設定ボタンを小さく
	$("#button_customcontrol_config").css({"height":"20px","width":"80px","fontSize":"50%","padding":"5px"});
	//プッシュ通知ボタンを小さく
	$("#button_customcontrol_push").css({"height":"20px","width":"80px","fontSize":"50%","padding":"5px"});

	//カスタムコントロール追加
	addCustomControlShowNearPokemon();
	addCustomControlStreetView()
//	addCustomControlSearchPokeSource();

	addCustomControlShowPokemonWithoutWimp();
	addCustomControlShowPushOnly();
	addCustomControlShowPokemonDictionary();
	
	//アイコンマップ追加時
	map.on('layeradd', function(layer, layername){
		var ent = pokemon_list[layer.layer._locid];
		if(ent && ent.action == "found"){
			layer.layer.on('contextmenu',onRightClickMarkerMap);
		}
	});
	//初回のみすでに表示済みなので呼び出して実行
	setEvent();
	
	//右クリック無効化
	map.on('contextmenu',function(){});
	
	//マップデフォルト設定
	var layerControlElement = document.getElementsByClassName('leaflet-control-layers')[0]; //マップ切り替えのレイヤを取得
	layerControlElement.getElementsByTagName('input')[2].click();	//マップレイヤのチェックボックスの2つ目を選択
	
	//近くのポケモンクリック(いきなりすぎると表示まで時間かかるのでディレイ)
	setTimeout(function(){$("#button_customcontrol_ShowNearPokemon").click();},3000)
	
}
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/汎用関数_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//全てのポケモンの表示、非表示を変更
function changeAllPokemon(isShow){
	//スタイル未定義エラー回避のため、一度も処理されていない場合はスタイルをダミーで作成
	if($.trim($("#area_customcontrol_config_data_list").html()) == ""){
		var viewhtml = "";
		for (var i=1; i<=151; i++) {
			viewhtml += "<div id='area_configwindow_list_"+i+"' style='width:260px;' ></div>";
		}
		$("#area_customcontrol_config_data_list").html(viewhtml);
	};
	
	//すべてを変更
	allChangeConfigView(isShow?0:1); //allChangeConfigViewは、表示が0、非表示が1
};

//指定キーのポケモンまでのルートを表示
var _rootLine;
function drawRoute(key){
	console.log("★drawRoute1:"+key);
	if(!pokemon_list[key]) return;
	console.log("★★drawRoute2:"+key);

	var ent;
	var lat;
	var lng;

	ent = pokemon_list[key];

	if(gpslog_loc){
		//GPSがONの時はGPS値を利用
		lat = gpslog_loc.latitude;
		lng = gpslog_loc.longitude;
	} else {
		//GPSがOFFの時は画面中央を利用
		var center = getCenterMap();
		lat = center[0];
		lng = center[1];
	};

	var loc = key.split(",");
		
	var points =[];
	var origin = new google.maps.LatLng(lat,lng);	//出発点
	var destination = new google.maps.LatLng(loc[0],loc[1]);						//目的地
	var mode = google.maps.TravelMode.DRIVING;					//交通手段 driving/walking/bicycling

	var directionsService = new google.maps.DirectionsService;
	directionsService.route({
	    	origin: origin,
	    	destination: destination,
    		travelMode: mode,
			drivingOptions: {
				departureTime: new Date(),
				trafficModel: google.maps.TrafficModel.BEST_GUESS
			},
		}, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK) {
			viewServerError(false);
			//ポイントを検索
			for(var i=0; i< response.routes[0].overview_path.length; i++){
				var path = response.routes[0].overview_path[i];
				if(i==0){
					//開始点を追加
					points.push([path.lat(),path.lng()]);
				}
				//終点を追加
				points.push([path.lat(),path.lng()]);
			}
			
			var color;
			var message;
			
			if((new Date()).getTime()/1000 + response.routes[0].legs[0].duration.value <= pokemon_list[key]["tol"]/1000){
				//間に合う
				color = "green";
				message = "◎間に合う！";
			} else {
				//間に合わない
				color = "red";
				message = "×間に合わない";
			}
			
			//道順を描画
			if(_rootLine) _rootLine.remove();
			_rootLine = L.polyline(points, {color: color}).addTo(map);

			if(pokemon_list[key]){
				var ent = pokemon_list[key];
				if(ent.overlay){
					//距離と到着時間を表示
	  				ent.overlay.bindPopup("<div style='font-size:12px;font-weight:bold;'>" + getPokemonLocal(pokemon_list[key].id) + "" +
	  										"<br />消滅時刻：" + viewToL(pokemon_list[key].tol) +
	  										"<br />距離　　：" + response.routes[0].legs[0].distance.text +
	  										"<br />車で　　：" + response.routes[0].legs[0].duration.text +
	  										"<br /><font color='" + color + "'>" + message + "</font> </div>")
	  				   .openPopup();
				}
			}
			
		} else {
			viewServerError("ルートステータスエラー");
			console.log("★★ステータス値異常" + status);
		};
	});
}

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/GoogleMap追加_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
function addGoogleLayers(){
	var gmap_hyb = new  L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {maxZoom: 21,minZoom: 6,reuseTiles: true,subdomains:['mt0','mt1','mt2','mt3']})
	var gmap_str = new  L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {maxZoom: 21,minZoom: 6,reuseTiles: true,subdomains:['mt0','mt1','mt2','mt3']})
	var gmap_sat = new  L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {maxZoom: 21,minZoom: 6,reuseTiles: true,subdomains:['mt0','mt1','mt2','mt3']})
	var gmap_ter = new  L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {maxZoom: 21,minZoom: 6,reuseTiles: true,subdomains:['mt0','mt1','mt2','mt3']})

	//ベースレイヤーグループ化
	var baseMaps = {
	    "デフォルト": _tilelayer,
	    "GoogleMap(ハイブリッド)": gmap_hyb,
	    "GoogleMap(ストリート)": gmap_str,
	    "GoogleMap(衛星写真)": gmap_sat,
	    "GoogleMap(地形)": gmap_ter
	};

	L.control.layers(baseMaps).addTo(map);
}
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/GoogleMapAPI追加_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
function prepareGoogleMapApi(){
	$.getScript("https://maps.googleapis.com/maps/api/js");
}
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/バウンズアニメーション用JS追加_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//https://github.com/hosuaby/Leaflet.SmoothMarkerBouncing
function prepareBounceMarker(){
	$.getScript("https://hosuaby.github.io/Leaflet.SmoothMarkerBouncing/vendor/Leaflet.SmoothMarkerBouncing/leaflet.smoothmarkerbouncing.js",
		function(){
			//プラグイン読み込み完了後にアニメーションデフォルト値設定
			L.Marker.setBouncingOptions({
		        bounceHeight : 60,   // height of the bouncing
		        bounceSpeed  : 54   // bouncing speed coefficient
			});

			//既に登録済みのマーカを設定(スクリプトの読み込みがマーカー生成後なので)
			for(var key in map._layers){
				var marker = map._layers[key];
				if(marker._icon){
					marker._bouncingMotion = {
            			isBouncing: false
        			};
        			marker._calculateTimeline()
				}
			}

/*			
			//既に登録済みのマーカを設定(スクリプトの読み込みがマーカー生成後なので)
			for(var key in pokemon_list){
				var ent = pokemon_list[key];
				if(ent && ent["overlay"]){
					ent["overlay"]._bouncingMotion = {
            			isBouncing: false
        			};
        			ent["overlay"]._calculateTimeline()
				}
			}
*/
		}
	);
}

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/プロット間隔短縮化_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//表示間隔短縮化
function hoge(){requestDBServer('viewData');}

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/フッタ非表示_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
function hideFooter(){
	$("table")[0].hidden=true;
	$("table").css({"height":"24px"});
	$("header").css({"height":"24px"});
	$("#area_map_frame").css({"margin-bottom":"0px","margin-top":"24px"});
	adSetHidden();
	$("#area_window_visibleinfo").css({"height": "32px"});//エラーメッセージ縮小化
	map.invalidateSize(); 
}
function getFooterHeight() {return 0;} //既存メソッドをオーバライド

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/近くのポケモン表示_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/近くのポケモンボタン_/_/_/_/_/_/_/_/_/_/
function addCustomControlShowNearPokemon(){
	var customControlShowNearPokemon = L.Control.extend({
			options: {
		    	position: 'topright' 
		  	},

			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-command-interior');
					container.id = "button_customcontrol_ShowNearPokemon";
					container.innerHTML = "近くのﾎﾟｹﾓﾝ";
					container.style.backgroundColor = 'white';
					container.style.width = '80px';
					container.style.height = '20px';
					container.style.padding = '5px';
					container.style.fontSize = '50%';
					container.style.textAlign = 'center';
					container.style.fontColor = '#999999';
					container.style.cursor = 'pointer';

					container.onclick = function(){
		      			ShowNearPokemonMain();
		    		}
		    	return container;
		  	},
		});
	map.addControl(new customControlShowNearPokemon());
}

var _shownPokeFlag = false;
var _interval_ShowNearPokemon;
function ShowNearPokemonMain(){
	if(_shownPokeFlag) {
		//停止
		$('#button_customcontrol_ShowNearPokemon').css('backgroundColor', 'white');
        clearInterval(_interval_ShowNearPokemon);
		if($('#area_pokelist').size() != 0 ) $('#area_pokelist').remove();
        _shownPokeFlag = false;
    } else {
    	//開始
		$('#button_customcontrol_ShowNearPokemon').css('backgroundColor', '#FFCC66');
		//一定間隔でポケモンリストを更新
		ShowNearPokemon();
		_interval_ShowNearPokemon = setInterval(ShowNearPokemon, 5000);
        _shownPokeFlag = true;
    }
}

var _shownList = [];
var _currentPokeId = 0;
var _currentIndex = 0;
function ShowNearPokemon(){
	var pokeList = [];
	
	//初期化
	_shownList = [];
	
	//すべてのリストを対象に処理
	for (var i in pokemon_list) {
		if (!pokemon_list[i]) continue;							//リストが未存在ならスキップ
		if (pokemon_list[i]["delete"]) continue;				//リストが削除済みであればスキップ
		if (pokemon_list[i]["action"] != "found") continue;		//ポケモン以外であればスキップ
		if (checkBoundsDiffOver(i)) continue;					//画面外であればスキップ
		
		if(!_shownList[pokemon_list[i].id]){
			//初めての場合、オブジェクトを登録
//			console.log(pokemon_list[i].loc);
			pokeList = new Array();
			pokeList.push(pokemon_list[i]);
			_shownList[pokemon_list[i].id]={"id": pokemon_list[i].id, "count": 1, "pokeList": pokeList};
		} else {
			pokeList = _shownList[pokemon_list[i].id].pokeList;
			pokeList.push(pokemon_list[i]);
			//既に存在している場合は、カウンタをインクリメント
			_shownList[pokemon_list[i].id].count++;
		}
	}

	//発見済みリストをソート
	_shownList.sort(function(a,b){
		if(!a || !b) return 0;

		//１．レア度の降順
		if(rare_table[a.id] != rare_table[b.id]) return rare_table[b.id] - rare_table[a.id];
		
		
		//２．出現数の昇順
		if(a.count != b.count) return a.count - b.count;

		//３．IDの降順
		return b.id - a.id;
	})
	
	//表示エリア描画
	if($('#area_pokelist').size() == 0 ){
		var html = "<div id='area_pokelist' style='display: block; position: fixed; background-color: rgba(200, 200, 255, 0.901961); z-index: 2000001; left: 50px; right: 50px; height: 48px; top: 24px; margin: 0 auto;'>"
		html 	+= "	<div style='width:100%;height:100%;overflow-y: hidden;overflow-x: auto;-webkit-overflow-scrolling: touch; white-space:nowrap;'>"
		html 	+= "		<div style='padding:5px;'>"
		html 	+= "			<div id='area_pokelist_data' style='display: table-cell;vertical-align: middle;font-size: 50%;'>"
		html 	+= "			</div>";
		html 	+= "		</div>";
		html 	+= "	</div>";
		html 	+= "</div>";

		$('body').append(html);
	}

	//データ描画
	html = "					<img id='pokemonBall' src='" + getPokemonBallURL() + "' style='width:25px; cursor:pointer;' onclick='onShownPokemonClick(-1);' oncontextmenu='onShownPokemonRightClick(-1); return false;'>";

	for (i=0;i<_shownList.length;i++){
		if(!_shownList[i]) continue;	
		
		html += "				<img src='" + getIconImage(_shownList[i].id) + "' style='width:25px; cursor:pointer;' onclick='onShownPokemonClick(\""+ _shownList[i].id + "\");' oncontextmenu='onShownPokemonRightClick(\""+ _shownList[i].id + "\"); return false;'>" + _shownList[i].count;
	}	
	
	$('#area_pokelist_data').html(html);
}

//近くのポケモンのクリック時
function onShownPokemonClick(id){	
	if(id == -1){
		_currentPokeId = id;
		_currentIndex = 0;
		//スーパーボル時は、すべてのポケモンを表示する
		changeAllPokemon(true);
	} else {
		//クリック対象を探す
		var shownPoke;
		for(var i = 0;i<_shownList.length;i++){
			if(_shownList[i].id == id){
				shownPoke = _shownList[i];
				break;
			}
		}
		
		//見つけられなければ終了
		if(!shownPoke) return;
		
		if(id != _currentPokeId){
			//対象ポケモンが前回と変わっていれば初期化
			_currentPokeId = id;
			_currentIndex = 0;
		}else{
			//変わりない場合は、次の同一ポケモンへ
			_currentPokeId = id;
			_currentIndex++;
			if(shownPoke.pokeList.length <= _currentIndex) _currentIndex=0;
		}
		
		//対象のポケモン情報を取得
		var poke = shownPoke.pokeList[_currentIndex];
	
		//経路を描画
		drawRoute(poke.loc);
		
		//クリックされたポケモンのみ表示する
		changeAllPokemon(false);
		toggleConfigViewList(id);

		//画面中央にポケモンを表示
		var tmp = poke.loc.split(",");
		map.setView([tmp[0],tmp[1]]);

		//ポップアップ位置とGPS位置
		protPolylineFromGPS(tmp[0],tmp[1]);
		
		//ストリートビューモード時は、ビューの位置も移動する
		if(_isStreetViewMode){
			if(pokemon_list[poke.loc]){
				//ストリートビューの位置を変更
				moveToPokemon(pokemon_list[poke.loc]["overlay"]);
			}
		}
	}
}

//_/_/_/_/_/_/_/_/近くのポケモンの右クリック時_/_/_/_/_/_/_/_/_/_/
function onShownPokemonRightClick(id){
	if(id == -1){
		//ポケモンボール時は、ポケモンボール変更
		changePokemonBall();
	} else {
		//まず、すべてのバウンスを停止
		L.Marker.stopAllBouncingMarkers();	
		//クリック対象のポケモンマーカにアニメーションを設定する
		var shownPoke;
		for(var i = 0;i<_shownList.length;i++){
			if(_shownList[i].id == id){
				//全てのポケモンにアニメーションを設定
					for(var key in _shownList[i].pokeList){
						var poke = _shownList[i].pokeList[key];
						if(pokemon_list[poke.loc] && pokemon_list[poke.loc]["overlay"] && pokemon_list[poke.loc]["overlay"]._map){
							//バウンズアニメーションを設定
							pokemon_list[poke.loc]["overlay"].bounce(3);//bounce "n" times
						}
					}					
				break;
			}
		}
	}
}

//_/_/_/_/_/_/_/_/ポケモンボール変更_/_/_/_/_/_/_/_/_/_/
var _currentPokemonBallIndex=0;
function changePokemonBall(){
	_currentPokemonBallIndex++;
	if(_pokemonBallUrlList.length <= _currentPokemonBallIndex) _currentPokemonBallIndex=0;
	
	$("#pokemonBall").attr({'src':getPokemonBallURL()});
}

//_/_/_/_/_/_/_/_/ポケモンボールのURL変更_/_/_/_/_/_/_/_/_/_/
var _pokemonBallUrlList = [];
function getPokemonBallURL(){
	//初回の場合のみURLをセットする
	if(_pokemonBallUrlList.length==0){
		_pokemonBallUrlList =[
			"https://renote.s3.amazonaws.com/uploads/article_image/file/46018/CORKYm-UkAAwgGm.png",
			"https://renote.s3.amazonaws.com/uploads/article_image/file/46028/i320.jpeg",
			"https://d13xjf6056yhmz.cloudfront.net/349639/f02afb3d0344825dd0c0ec0f87300c00_2016-08-18.png/show?1471499558",
			"https://d13xjf6056yhmz.cloudfront.net/417706/5aaf53609dc75162206e17a71599dd8b_2016-09-21.png/show?1474428430",
			"https://cdn.pixabay.com/photo/2016/08/15/00/50/pokeball-1594373_960_720.png",
			"https://renote.s3.amazonaws.com/uploads/article_image/file/46034/1429806633.jpeg"
		];
	}
	
	//カレントのURLを返却する
	return _pokemonBallUrlList[_currentPokemonBallIndex];
}

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/ポケモン図鑑表示_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/ポケモン図鑑ボタン_/_/_/_/_/_/_/_/_/_/
function addCustomControlShowPokemonDictionary(){
	var customControlShowPokemonDictionary = L.Control.extend({
			options: {
		    	position: 'bottomright' 
		  	},

			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-command-interior');
					container.id = "button_customcontrol_ShowPokemonDictionary";
					container.innerHTML = "ﾎﾟｹﾓﾝ図鑑";
					container.style.backgroundColor = 'white';
					container.style.width = '80px';
					container.style.height = '20px';
					container.style.padding = '5px';
					container.style.fontSize = '50%';
					container.style.textAlign = 'center';
					container.style.fontColor = '#999999';
					container.style.cursor = 'pointer';

					container.onclick = function(){
		      			ShowPokemonDictionaryMain();
		    		}
		    	return container;
		  	},
		});
	map.addControl(new customControlShowPokemonDictionary());
}

var _shownPokemonDictionary = false;
function ShowPokemonDictionaryMain(){
	if(_shownPokemonDictionary) {
		//停止
		$('#button_customcontrol_ShowPokemonDictionary').css('backgroundColor', 'white');
		if($('#area_pokemon_dictionary').size() != 0 ) $('#area_pokemon_dictionary').hide();
        _shownPokemonDictionary = false;
    } else {
    	//開始
		$('#button_customcontrol_ShowPokemonDictionary').css('backgroundColor', '#FFCC66');
		ShowPokemonDictionary();
        _shownPokemonDictionary = true;
    }
}

function ShowPokemonDictionary(){
	
	if($('#area_pokemon_dictionary').size() == 0 ){
		//初回表示
		var html = "<div id='area_pokemon_dictionary' style='display: block; position: fixed; background-color: rgba(200, 200, 255, 0.901961); z-index: 2000001; left: 100px; right: 100px; height: 48px; bottom: 10px; margin: 0 auto;'>"
		html 	+= "	<div style='width:100%;height:100%;overflow-y: hidden;overflow-x: auto;-webkit-overflow-scrolling: touch; white-space:nowrap;'>"
		html 	+= "		<div style='padding:5px;'>"
		html 	+= "			<div id='area_pokemon_dictionary_data' style='display: table-cell;vertical-align: middle;font-size: 50%;'>"

//		html	+= "				<img id='pokemonBall' src='" + getPokemonBallURL() + "' style='width:25px; cursor:pointer;' onclick='onDictionalyBallClick();' oncontextmenu='return false;'>";

		for (var i=1; i<=151; i++){
			html += "					<img id='pokemon_dictionary_" + i  + "' src='" + getIconImage(i) + "' style='width:25px; cursor:pointer;' onclick='onPokemonDictionaryClick(\""+ i + "\");' oncontextmenu='onPokemonDictionaryRightClick(\""+ i + "\"); return false;'>";
			html += "					<span id='tip_" + i + "' style='width: 500px;'></span>";
		}	

		html 	+= "			</div>";
		html 	+= "		</div>";
		html 	+= "	</div>";
		html 	+= "</div>";
		$('body').append(html);
		
		//画像のホバー処理
		for (var i=1; i<=151; i++){
			$("#pokemon_dictionary_" + i).hover(function(){
				if($('#tip_' + i).size==0) return;
				$('#tip_' + i).show();
			}, function() {
				$('#tip_' + i).hide();
			}).mousemove(function(e) {
				var tip = $('#tip_' + i);
				var mousex = e.pageX + 20; //Get X coodrinates
				var mousey = e.pageY + 20; //Get Y coordinates
				var tipWidth = tip.width(); //Find width of tooltip
				var tipHeight = tip.height(); //Find height of tooltip

				var tipVisX = $(window).width() - (mousex + tipWidth);
				var tipVisY = $(window).height() - (mousey + tipHeight);

				if ( tipVisX < 20 ) { //If tooltip exceeds the X coordinate of viewport
					mousex = e.pageX - tipWidth - 20;
				} if ( tipVisY < 20 ) { //If tooltip exceeds the Y coordinate of viewport
					mousey = e.pageY - tipHeight - 20;
				}

				tip.css({  top: mousey, left: mousex });
			});
		}
	} else {
		//二回目以降表示
		$('#area_pokemon_dictionary').show();
	}
}

//_/_/_/_/_/_/_/_/ポケモン辞書のクリック時_/_/_/_/_/_/_/_/_/_/
function onPokemonDictionaryClick(id){
	jumpSearchMobList(id);
}

//_/_/_/_/_/_/_/_/ポケモン辞書の右クリック時_/_/_/_/_/_/_/_/_/_/
function onPokemonDictionaryRightClick(id){
}

//_/_/_/_/_/_/_/_/ポケモン辞書ボール右クリック時_/_/_/_/_/_/_/_/_/_/
var _interval_searchNearestPokemon;
function onDictionalyBallClick(){
	//既に実行済みの場合はスキップ
	if(_interval_searchNearestPokemon) return;
	
	//全てのポケモン状況を確認
	var pid=1;
	var loc1 = -1;
	var loc2 = -1;
	if (gpslog_loc) {
		loc1 = gpslog_loc.latitude;
		loc2 = gpslog_loc.longitude;
	} else {
		var latlng = getCenterMap();
		loc1 = latlng[0];
		loc2 = latlng[1];
	}

	//全てのポケモンを確認
	_interval_searchNearestPokemon = setInterval(function(){
		searchNearestPokemon(loc1,loc2,pid);
		pid++;
		if(151<pid){
			clearInterval(_interval_searchNearestPokemon);
			_interval_searchNearestPokemon=null;
		}
	},5000);
}

//_/_/_/_/_/_/_/_/最寄りのポケモン検索_/_/_/_/_/_/_/_/_/_/
function searchNearestPokemon(loc1,loc2,pid){
	console.log("■■最寄りのポケモン検索："+pid);

	$.ajax({
	    url: "https://"+using_dbserver+"/_dbserver.php?uukey=c2e316f11149c3f8e1ff5da39efe46de&sysversion=1000&action=getSearchMob&pid="+pid+"&loc1="+encodeURIComponent(parseFloat(loc1))+"&loc2="+encodeURIComponent(parseFloat(loc2)),
	    type: "GET",
	    data: "",
	    timeout: 10000,
	    cache: false
	}).done(function(data, status, xhr) {
		console.log("■■最寄りのポケモン取得："+pid);

		var _viewhtml = "";
		if (data.indexOf("action=found_searchmob;") != -1) {				
			var data = data.split("\n");
			for (var i=0; i<data.length; i++) {
				var _ent = parseValue(data[i]);
				if (_ent["action"] == "found_searchmob") {
					var _loc = _ent["loc"].split(",");
					
			   		var _addmsg = "";
			   		var _bgcolor = "rgba(251,157,0,0.8)";
			   		
					_addmsg += "残り"+viewLeftToL(_ent["tol"])+" ";
			   		
					if (gpslog_loc) {
						var _meter = parseInt(getDistance(gpslog_loc.latitude, gpslog_loc.longitude, parseFloat(_loc[0]), parseFloat(_loc[1])));
						_addmsg += "<br>("+viewmeter(_meter)+")";
						
						try{
							var _movetime = MeterToMoveMethodSec(_meter,4);
							if (configpush_movemethod) {
								_movetime = MeterToMoveMethodSec(_meter,parseInt(configpush_movemethod));
							}
							if ((new Date()).getTime() + _movetime * 1000 <= parseInt(_ent["tol"])) {
								_bgcolor = "rgba(251,157,0,0.8)";
							} else {
								_bgcolor = "rgba(221,216,213,0.5)";
							}
						} catch(e) {
							console.log("error: 移動手段検出(searchmobhit):"+e);
						}
						
					}
			   		
			   		_viewhtml += "<div id='area_searchmobhit_item_"+i+"' style='font-size:90%;width:100%;cursor:pointer;padding:3px;margin:3px;margin-bottom:10px;background-color:"+_bgcolor+";' onclick='jumpMapArea(\""+_ent["loc"]+"\");'>"+_addmsg+"</div>";

				}
			}
		}
			
		if (_viewhtml != "") {
			_viewhtml = "<div style='font-size:90%;'>最寄りの<br>"+pokemon_table_ja[pid]+"</div>"+_viewhtml;
		} else {
			_viewhtml = "<div style='font-size:90%;'>検索結果がありませんでした。近くに「"+pokemon_table_ja[pid]+"」は出現(捕捉)していないようです。</div>";
		}
		
		$('#tip_' + pid).html(_viewhtml);

	}).fail(function(xhr, status, error) {
		console.log("■■■やっぱりエラー" + error);
	});
}
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/ポッポコラッタ以外表示_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
function addCustomControlShowPokemonWithoutWimp(){
	var customControlShowPokemonWithoutWimp = L.Control.extend({
			options: {
		    	position: 'bottomright' 
		  	},

			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-command-interior');
					container.id = "button_customcontrol_showPokemonWithoutWimp";
					container.innerHTML = "ﾎﾟｯﾎﾟｺﾗｯﾀ以外";
					container.style.backgroundColor = 'white';
					container.style.width = '80px';
					container.style.height = '20px';
					container.style.padding = '5px';
					container.style.fontSize = '50%';
					container.style.textAlign = 'center';
					container.style.fontColor = '#999999';
					container.style.cursor = 'pointer';

					container.onclick = function(){
						console.log('buttonClicked');
		      			showPokemonWithoutWimp();
		    		}
		    	return container;
		  	},
		});
	map.addControl(new customControlShowPokemonWithoutWimp());
}

//雑魚（ポッポ、コラッタ）以外を表示
function showPokemonWithoutWimp(){
	//すべてを表示する
	changeAllPokemon(true);
	
	//ポッポ、コラッタを非表示
	toggleConfigViewList(16);//ポッポ
	toggleConfigViewList(19);//コラッタ
}

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/通知のみ表示_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
function addCustomControlShowPushOnly(){
	var CustomControlShowPushOnly = L.Control.extend({
			options: {
		    	position: 'bottomright' 
		  	},

			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-command-interior');
					container.id = "button_customcontrol_showPushOnly";
					container.innerHTML = "通知のみ表示";
					container.style.backgroundColor = 'white';
					container.style.width = '80px';
					container.style.height = '20px';
					container.style.padding = '5px';
					container.style.fontSize = '50%';
					container.style.textAlign = 'center';
					container.style.fontColor = '#999999';
					container.style.cursor = 'pointer';

					container.onclick = function(){
						console.log('buttonClicked');
		      			showPushOnly();
		    		}
		    	return container;
		  	},
		});
	map.addControl(new CustomControlShowPushOnly());
}

function showPushOnly(){
	//プッシュ通知以外は非表示にする
	for (var i=1; i<=151; i++) {
		if( (config_push[i]=="1" && config_viewlist[i]=="1") || (config_push[i]!="1" && config_viewlist[i]!="1") ){
			toggleConfigViewList(i);
		}
	}	
}


//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/ポケモンまでの道順表示_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//ポケアイコン右クリック時
function onRightClickMarkerMap(e){
	drawRoute(this._locid);

	//ポップアップ位置とGPS位置
	var tmp = this._locid.split(",");
	protPolylineFromGPS(tmp[0],tmp[1]);
			
	//ストリートビューモード時は、ビューの位置も移動する
	if(_isStreetViewMode){
		moveToPokemon(this);
	}
}

//_/_/_/_/_/_/_/_/ポケモンへ移動_/_/_/_/_/_/_/_/_/_/
function moveToPokemon(marker){
	if(!marker._locid) return;
	var loc = marker._locid.split(",");		
	var latlng = new google.maps.LatLng(loc[0],loc[1]);						//目的地

	//半径50mにストリートビューがあるかチェック
	var sv = new google.maps.StreetViewService();
	sv.getPanoramaByLocation(latlng, 200, function(data, status) {
        if (status == google.maps.StreetViewStatus.OK) {
            //ストリートビュー対応エリアの場合

			//キャラ移動
			_myChar.setLatLng(marker.getLatLng());
            	            
            //マーカーの場所へワープ
			_panorama.setPosition(data.location.latLng);

			//向きを変更(なるべく移動中に向きを変えるため、ディレイ)
            var headingValue = google.maps.geometry.spherical.computeHeading(data.location.latLng,latlng);
            setTimeout(function(){_panorama.setPov(({heading: headingValue, pitch: -10}));},500);			
        }else{
        }
	});
}

//全てのポケモンにイベントを関連付け
function setEvent(){
	//全てのポケモンを処理
	for (var key in pokemon_list) {
		if(!pokemon_list[key]) continue;
		var ent = pokemon_list[key];
		if(ent.action == "found" && ent.overlay){
//			console.log("★" + ent.loc);
			ent.overlay.on('contextmenu',onRightClickMarkerMap);
		}
	}
}

//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/GoogleStreet対応_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/_/
//_/_/_/_/_/_/_/_/ストリートビュー表示ボタンの追加_/_/_/_/_/_/_/_/_/_/
function addCustomControlStreetView(){
	var customControlShowStreetView = L.Control.extend({
			options: {
		    	position: 'topright' 
		  	},

			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom leaflet-control-command-interior');
					container.id = "button_customcontrol_ShowStreetView";
					container.innerHTML = "ストリート表示";
					container.style.backgroundColor = 'white';
					container.style.width = '80px';
					container.style.height = '20px';
					container.style.padding = '5px';
					container.style.fontSize = '50%';
					container.style.textAlign = 'center';
					container.style.fontColor = '#999999';
					container.style.cursor = 'pointer';

					container.onclick = function(){
		      			showStreetView();
		    		}
		    	return container;
		  	},
		});
	map.addControl(new customControlShowStreetView());
}

var _isStreetViewMode = false;
//_/_/_/_/_/_/_/_/ストリートビュー表示切替_/_/_/_/_/_/_/_/_/_/
function showStreetView(){
	if(_isStreetViewMode) {
		//停止
		$('#button_customcontrol_ShowStreetView').css('backgroundColor', 'white');
		cleanupStreetView();
        _isStreetViewMode = false;
    } else {
    	//開始
		$('#button_customcontrol_ShowStreetView').css('backgroundColor', '#FFCC66');
		prepareStreetView();
        _isStreetViewMode = true;
    }
}

var _panorama;
var _myChar;
var _clickedMarker;
var _lastViewLatLng;
//_/_/_/_/_/_/_/_/ストリートビュー利用前の準備_/_/_/_/_/_/_/_/_/_/
function prepareStreetView(){
	
	//キャンバス作成
	$("#map-canvas").css("height","50%");
	$("#area_map_frame").append("<div id='streetView' style='width: 100%; height: 50%;'></div>");
	map.invalidateSize(); 

	//初期位置は画面中央
	var defPos = map.getCenter();

	//ストリートビュー初期化
	var panoramaOptions = {
		panControl: true,
		addressControl: false,
		linksControl: false,
		zoomControlOptions: true,		
		position: defPos,
		pov: {
			heading: 0,
			pitch: -10
			}
	};      
    _panorama = new google.maps.StreetViewPanorama($("#streetView").get(0),panoramaOptions);

	//マイキャラ設定
	var _icon = L.icon({
		//トレーナー
	    iconUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/s/salawab/20161119/20161119122203.png',
	    iconRetinaUrl: 'https://cdn-ak.f.st-hatena.com/images/fotolife/s/salawab/20161119/20161119122203.png',
	    iconSize: [30, 75],
	    iconAnchor: [10, 50]
	});
	_myChar = L.marker(defPos, {icon: _icon,draggable: true});
	_myChar.addTo(map)
		.on('dragend', function(e) {
			map.panTo(e.target.getLatLng());
			_panorama.setPosition(e.target.getLatLng());
		});
	
	//最終位置を初期化
	_lastViewLatLng=[0,0];
	
	//ストリートビューのイベントと関連付け
	_panorama.addListener('position_changed', function() {
		var latlng = _panorama.getPosition();
		var lat = latlng.lat();
		var lng = latlng.lng();
		
		//上画面
		_myChar.setLatLng([lat,lng]);
		map.panTo([lat,lng]);

		//最後に全処理した位置から200m以上移動した場合は、全表示する
		if(200 <= getDistance(parseFloat(_lastViewLatLng[0]),parseFloat(_lastViewLatLng[1]),parseFloat(lat),parseFloat(lng))){
			//既に表示済みの全てのマーカーを対象に処理
			for (var key in pokemon_list) {
				if(!pokemon_list[key]) continue;
				var ent = pokemon_list[key];
				if(ent.action == "found" && ent.overlay){
					addMarkerToStreetView(ent.loc);
				}
			}
			//最後の現在地を更新
			_lastViewLatLng = [lat,lng];
		}
	});
	
	//マップのイベントと関連付け
	map.on('layeradd', markerAddEventHandler);				//マーカ追加時
	map.on('layerremove', markerRemoveEventHandler);		//マーカ削除時
	map.on('contextmenu', mapRightClickEventHandler);		//地図右クリック時
}

//_/_/_/_/_/_/_/_/マーカ追加時のイベントハンドラ_/_/_/_/_/_/_/_/_/_/
function markerAddEventHandler(layer, layername){
	var ent = pokemon_list[layer.layer._locid];
	if(ent && ent.action == "found"){
		addMarkerToStreetView(ent.loc);
	}
}

//_/_/_/_/_/_/_/_/マーカ削除時のイベントハンドラ_/_/_/_/_/_/_/_/_/_/
function markerRemoveEventHandler(layer, layername){
	var ent = pokemon_list[layer.layer._locid];
	if(ent && ent.action == "found"){
		removeMarkerFromStreetView(ent.loc);
	}
}

//_/_/_/_/_/_/_/_/マーカ右クリック時のイベントハンドラ_/_/_/_/_/_/_/_/_/_/
function mapRightClickEventHandler(layer, layername){
	_myChar.setLatLng(layer.latlng);
	_panorama.setPosition(layer.latlng);
}

//_/_/_/_/_/_/_/_/ストリートビューモードの終了_/_/_/_/_/_/_/_/_/_/
function cleanupStreetView(){
	//マーカの削除
    _streetViewMarkers.forEach(function(marker, idx) {
      marker.setMap(null);
    });
    _streetViewMarkers = [];
    
    //マップに関連付けていたイベントを削除
	map.off('layeradd', markerAddEventHandler);
	map.off('layerremove', markerRemoveEventHandler);
	map.off('contextmenu', mapRightClickEventHandler);

	//マイキャラ削除
	_myChar.remove();
	_myChar = null;
	
	//ストリートビュー削除
	_panorama = null;
	
	//キャンバス削除
	$("#streetView").remove();
	$("#map-canvas").css("height","100%");
	map.invalidateSize(); 
}

_streetViewMarkers=[];
//_/_/_/_/_/_/_/_/ストリートビューへ、指定のマーカ追加_/_/_/_/_/_/_/_/_/_/
function addMarkerToStreetView(key) {
	var ent = pokemon_list[key];
	var latlng = ent.loc.split(",");
	
	var myCharLatLng = _myChar.getLatLng();

	//ストリートビューへの追加前チェック
	var i;
	for(i=0; i<_streetViewMarkers.length;i++){
		var marker = _streetViewMarkers[i]
		
		//既に追加済みであれば追加しない
		if(marker.loc == key) return;	//既に追加済み
	}

	//半径200m以上であれば追加しない
	if(200<=getDistance(parseFloat(myCharLatLng.lat), parseFloat(myCharLatLng.lng), parseFloat(latlng[0]), parseFloat(latlng[1]))) return; //半径200ｍ以上

	//マーカの追加
	var marker = new google.maps.Marker({
		position: {"lat":parseFloat(latlng[0]),"lng":parseFloat(latlng[1])},
		map: _panorama,
		icon: getIconImage(ent.id),
		title: getPokemonLocal(ent.id)
	});
	marker.loc=ent.loc;
	_streetViewMarkers.push(marker);
	
	//マーカのクリックイベント作成(マーカの位置へワープ)
	marker.addListener('click', function() {
		var sv = new google.maps.StreetViewService();
		
		//指定場所付近にストリートビューがあるかチェック
    	sv.getPanoramaByLocation(marker.getPosition(), 200, function(data, status) {
	        if (status == google.maps.StreetViewStatus.OK) {
	            //ストリートビュー対応エリアの場合
	            
	            if(_panorama.getPosition().toString() == data.location.latLng.toString()){
	            	var message;
	            	//位置が変わらない場合は、これ以上近づけないのでメッセージを表示
			        if($("#view_message_area").size() == 0){
				        message = document.createElement('div');
				        message.id = "view_message_area"
				        message.style.backgroundColor = "rgba(200, 200, 255, 0.901961)"
				        message.style.height = "24px";
				        message.style.width = "50%";
				        message.style.fontFamily = "Meiryo";
				        message.style.fontSize = "medium";
				        message.style.textAlign = "center";
				        message.style.display = "none"
						message.innerHTML = "これ以上近づけません（＞＿＜）";
					} else {
						//なんか再描画で位置がずれるので、再格納する
						message = _panorama.controls[google.maps.ControlPosition.TOP_CENTER].pop();
					}
					_panorama.controls[google.maps.ControlPosition.TOP_CENTER].push(message);
					$("#view_message_area").fadeIn("fast");
					setTimeout(function(){$("#view_message_area").fadeOut("slow");},1000);	            	
	            }else{
		            //マーカーの場所へワープ
					_panorama.setPosition(data.location.latLng);

					//向きを変更(なるべく移動中に向きを変えるため、ディレイ)
		            var headingValue = google.maps.geometry.spherical.computeHeading(data.location.latLng,marker.getPosition());
		            setTimeout(function(){_panorama.setPov(({heading: headingValue, pitch: -10}));},500);
	            }				
	        }else{
	        	//ストリートビュー非対応の場合
	        	console.log("■■ストリートビュー非対応or不明なエラー")
			}
		});
	});

	console.log("★★追加:"+key);
}

//_/_/_/_/_/_/_/_/ストリートビューから、指定のマーカ削除_/_/_/_/_/_/_/_/_/_/
function removeMarkerFromStreetView(key){
	var i;
	for(i=0; i<_streetViewMarkers.length;i++){
		var marker = _streetViewMarkers[i]
		if(marker.loc == key){
			marker.setMap(null);
			_streetViewMarkers.splice(i,1);
			console.log("★★削除:"+key);
			return;
		}
	}
}