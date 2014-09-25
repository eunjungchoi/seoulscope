(function() {
    var app = angular.module('seoulscope', ['ngRoute', 'xeditable']);

    app.constant('config', {
    	api_key: "AIzaSyCUphKCCMUpng-f3DZEiCGhT8j06GliYRo",
    	tables: {
	    	domain: {
	    		id:  "1wyHT6nLOpM57AbT0dyS86Bz6f-bxP6mpv2Qw4vlm",
	    		fields: "name, description, center, zoom, 'order'",
	    	},
	        zone: {
	        	id: "1mIutuGqnSYRGz7hrWn__Ll-Xq-Ru-5amqoBJHiXU",
	        	fields: "Name, Description, Center, Zoom, Photo, Shape",
	        },
	        spot: {
	        	id: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
	        	fields: "Name, Address, Coordinates, Area",
	        },
	        log: {
	        	id: "1bW1VuYnupB4thC4iSyhzDxTNwxHTMHm4qHIxxDWc",
	        	fields: "Date, Name, Text, Photo, photos",
	        }
    	},
    	currentUser: null,
    });

    app.config(function($routeProvider) {
		$routeProvider
			.when('/domain', {
				templateUrl: 'template/domain.html',
				controller: 'DomainController',
			})
			.when('/zone', {
				templateUrl: 'template/zone.html',
				controller: 'ZoneController',
			})
			// .when('/spot', {
			// 	templateUrl: 'template/spot.html',
			// 	controller: 'SpotController',
			// })
			.when('/log', {
				templateUrl: 'template/log.html',
				controller: 'LogController',
			})
    });

	app.run(['$rootScope', '$location', 'editableOptions', 'editableThemes', 'db',
		function($rootScope, $location, editableOptions, editableThemes, db) {
			editableThemes.bs3.inputClass = 'input-sm';
			editableThemes.bs3.buttonsClass = 'btn-sm';
			editableOptions.theme = 'bs3';

    		$rootScope.currentUser = G.currentUser;
    		$rootScope.message = null;
    		$rootScope.showMessage = function(message) {
    			$rootScope.message = message;
    		}

    		if ( $rootScope.currentUser ) {
				document.getElementById("loader").classList.add("show");

				db.load()
					.then(function() {
						document.getElementById("loader").classList.remove("show");
						if ( G.hash )
							$location.path(G.hash.replace("#", ""));
					});
	    	}
		}
	]);

    app.factory('AuthFactory', ['$rootScope', 'config',
    	function($rootScope, config) {
    		return {
    	// 		authorize: function() {
					// gapi.client.setApiKey(config.api_key);
					// gapi.auth.authorize({
					// 		client_id: "523831962603-epe6gir9d2q4pjv08kgo4nn75ogguj8c.apps.googleusercontent.com",
					// 		scope: "https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/fusiontables",
					// 	},
					// 	function(response) {
					// 	});

    	// 		},
    	// 		isLoggedIn: function() {
    	// 			return $rootScope.currentUser !== null;
    	// 		},
    			login: function(success) {
					gapi.client.setApiKey(config.api_key);
					gapi.auth.authorize({
							response_type: "token",
							client_id: G.client_id,
							scope: G.scope,
							immediate: false,
						},
						function(response) {
				// console.log("cont", response);
							// response.status.signed_in;
							if ( response && !response.error ) {
								gapi.client.load('fusiontables', 'v1', function() {
									var currentUser = {
										name: 'g',
										token: response.access_token,
										token_type: response.token_type,
									}
									$rootScope.$apply(function() {
										$rootScope.currentUser = currentUser;
									});

									(success || angular.noop)();
								});
							} else {
								console.log(response);
							}

						}
					);
    			},
    			logout: function() {
    				disconnectUser();
    				// currentUser = null;
    				$rootScope.currentUser = null;
    			},

    			user: $rootScope.currentUser,
    		}
    	}
    ]);

	app.factory('global', function() {
		var message = null;

		return {
			message: message,
			showMessage: showMessage,
			clearMessage: clearMessage,
		}

		function showMessage(message) {
			message = message;
		}

		function clearMessage() {
			message = null;
		}
	});

	app.factory('db', ['config', 'FusionTable',
		function(config, FusionTable) {
			var domains = [];
			var zones = [];
			var spots = [];

			return {
				getDomains: function() { return domains; },
				getZones: function() { return zones; },
				getSpots: function() { return spots; },
				load: load,
			}

			function load() {
				return FusionTable.select(config.tables.domain)
					.then(function(data) {
						domains = data;
						return FusionTable.select(config.tables.zone);
		    		})
		    		.then(function(data) {
		    			zones = data;
						return FusionTable.select(config.tables.spot);
		    		})
		    		.then(function(data) {
		    			spots = data;
		    		})
		}
	}]);

    app.service('FusionTable', ['$http', 'config', '$rootScope', 'global',
    	function($http, config, $rootScope, global) {
	    	return ({
	    		select: select,
	    		insert: insert,
	    		update: update,
	    	});

	    // 	function createLog() {
	    // 		return {
					// id: null,
					// Date: '',
					// Name: '',
					// Text: '',
					// Photo: '',
	    // 		}
	    // 	}

			function select(table) {
			    var query = encodeURIComponent("SELECT ROWID, " + table.fields + " FROM " + table.id);
			    var url = 'https://www.googleapis.com/fusiontables/v1/query?sql=' + query + '&key=' + config.api_key;
    			// url = "https://picasaweb.google.com/data/feed/api/user/default" + '?key=' + config.api_key;

				var request = $http({
					url: url,
					method: 'post',
					headers: {'authorization': 'Bearer ' + $rootScope.currentUser.token},
				});

			    return ( request.then( onSelectSuccess, function(error) { console.log(error); global.showMessage(error) }, function(progress) { console.log(progress) } ) );
			}

			function insert(table, data) {
				var fields = [], values = [];
				for ( var key in data ) {
					if ( !data.hasOwnProperty(key) )
						continue;

					fields.push(key);
					values.push(data[key]);
				}

			    var query = encodeURIComponent("INSERT INTO "+table.id+" ('"+fields.join("','")+"') VALUES ('"+values.join("','")+"')");
			    var url = 'https://www.googleapis.com/fusiontables/v1/query?sql=' + query + '&key=' + config.api_key;
				var request = $http({
					url: url,
					method: 'post',
					// data: {
					// 	sql: query,
					// 	key: config.api_key,
					// },
					headers: {'authorization': 'Bearer ' + $rootScope.currentUser.token},
				});

			    return ( request.then( onInsertSuccess ) );
			}

			function update(table, data) {
				var fields = [];
				for ( var key in data ) {
					if ( !data.hasOwnProperty(key) || key == 'id' || key == "$$hashKey")
						continue;

					fields.push("'"+key+"' = '"+data[key]+"'")
				}

			    var query = encodeURIComponent("UPDATE "+table.id+" SET "+fields.join(',')+" WHERE ROWID = '"+data.id+"'");
			    var url = 'https://www.googleapis.com/fusiontables/v1/query?sql=' + query + '&key=' + config.api_key;
				var request = $http({
					url: url,
					method: 'post',
					// data: {
					// 	sql: query,
					// 	key: config.api_key,
					// },
					headers: {'authorization': 'Bearer ' + $rootScope.currentUser.token},
				});

			    return ( request );
			}

	    	function onSelectSuccess(response) {
	    		var data = response.data;
				var rows = [];
				for ( var i = 0, len = data.rows.length; i < len ; i++ ) {
					var o = {id: data.rows[i][0]};
					for ( var j = 1, len2 = data.columns.length ; j < len2 ; j++ )
						o[data.columns[j]] = data.rows[i][j];

					rows.push(o);
				}

				return rows;
	    	}

	    	function onInsertSuccess(response) {
	    		var id = response.data.rows[0][0];

				return id;
	    	}
    	}
    ]);

    app.factory('PicasaFactory', ['config', '$http', '$rootScope',
    	function(config, $http, $rootScope) {
    		var albums = [];

	    	return ({
	    		getAlbums: getAlbums,
	    		getPhotos: getPhotos,
	    	});

	    	function getAlbums() {
	    		var req = $http({
	    			url: "https://picasaweb.google.com/data/feed/api/user/" + $rootScope.currentUser.id + '?alt=json',
					// method: 'post',
	    			// headers: {
	    			// 	'GData-Version': 2,
	    			// 	'authorization': 'Bearer ' + $rootScope.currentUser.token,
	    			// },
	    		})

	    		return req.then( onGetAlbums );
	    	}


	    	function getPhotos(link) {
	    		var req = $http({
	    			url: link,
	    		})

	    		return req.then( onGetPhotos );
	    	}

	    	function onGetAlbums(response) {
	    		albums = [];

	    		response.data.feed.entry.forEach(function(d) {
	    			albums.push({
	    				id: d.id.$t,
	    				title: d.title.$t,
	    				link: d.link[0].href,
	    			});
	    		});

	    		return albums;
	    	}

	    	function onGetPhotos(response) {
	    		var photos = [];

	    		response.data.feed.entry.forEach(function(d) {
	    			photos.push(d.content.src);
	    		});

	    		return photos;
	    	}
    	}
	]);

	app.controller('BaseController', ['$scope', '$rootScope', 'AuthFactory', 'global', 'PicasaFactory',
		function($scope, $rootScope, AuthFactory, global, Picasa) {
			$scope.currentUser = AuthFactory.user;
			$scope.message = global.message;

			$scope.login = function() {
				AuthFactory.login(function() {
					$scope.$apply(function() {
						$scope.currentUser = $rootScope.currentUser;
					});
				});
			}

			$scope.logout = function() {
				AuthFactory.logout();
				$scope.currentUser = $rootScope.currentUser;
			}
		}
	]);

    app.controller('DomainController', ['$scope', 'FusionTable', 'config', 'db',
		function($scope, FusionTable, config, db) {
			$scope.domains = db.getDomains();

	    	$scope.addDomain = function() {
				$scope.inserted = {
					id: null,
					name: '',
					description: '',
					center: '',
					zoom: '',
					order: '',
				}
				$scope.domains.push($scope.inserted);
	    	}

	    	$scope.saveDomain = function(data, id) {
	    		if ( id ) {
	    			// FusionTable.update(config.tables.domain).values(data).where(id);
	    			data.id = id;
	    			FusionTable.update(config.tables.domain, data);
	    		}
	    		else {
	    			// FusionTable.insert(config.tables.domain).values(data);
	    			FusionTable.insert(config.tables.domain, data)
	    				.then(function(res_id) {
	    					$scope.inserted.id = res_id;
	    				});
	    		}
	    	}

			$scope.addDomain();
    	}
    ]);

    app.controller('ZoneController', ['$scope', 'FusionTable', 'config', 'db',
		function($scope, FusionTable, config, db) {
			$scope.zones = db.getZones();

	    	$scope.addZone = function() {
				$scope.inserted = {
					id: null,
					name: '',
					description: '',
					center: '',
					zoom: '',
					order: '',
				}
				$scope.zones.push($scope.inserted);
	    	}

	    	$scope.saveZone = function(data, id) {
	    		if ( id ) {
	    			data.id = id;
	    			FusionTable.update(config.tables.zone, data);
	    		}
	    		else {
	    			FusionTable.insert(config.tables.zone, data)
	    				.then(function(res_id) {
	    					$scope.inserted.id = res_id;
	    				});
	    		}
	    	}

	    	$scope.addZone();
    	}
    ]);

   //  app.controller('TagController', ['$scope', 'FusionTable', function($scope, FusionTable) {
   //  	FusionTable.select(config.table.tag)
   //  		.done(function(table) {
	  //           var arr = [];

	  //           for (var i = 0, numRows = table.getNumberOfRows(); i < numRows; i++) {
	  //               var latlng = table.getValueByLabel(i, "Center").split(',');

	  //           	arr.push({
	  //           		"id": table.getValueByLabel(i, "ID"),
	  //               	"name": table.getValueByLabel(i, "Name"),
	  //                   "description": table.getValueByLabel(i, "Description"),
	  //                   "center": table.getValueByLabel(i, "Center"),
	  //                   "zoom": parseInt(table.getValueByLabel(i, "Zoom")),
	  //                   // "folder": table.getValueByLabel(i, "Photo"),
	  //                   // "latlng": new google.maps.LatLng(latlng[0], latlng[1]),
	  //               });
	  //           }

			// 	$scope.$apply(function() {
			// 	    $scope.tags = arr;
			// 	});
			// });
   //  }]);

   //  app.controller('SpotController', ['$scope', 'FusionTable', function($scope, FusionTable) {
   //  	FusionTable.select(config.table.spot)
   //  		.done(function(table) {
	  //           var arr = [];

	  //           for (var i = 0, numRows = table.getNumberOfRows(); i < numRows; i++) {
	  //               // var coordinate = table.getValueByLabel(i, "Coordinate").split(',');

	  //           	arr.push({
	  //               	"name": table.getValueByLabel(i, "Name"),
	  //                   "tag": table.getValueByLabel(i, "Area"),
	  //                   // "coordinate": new google.maps.LatLng(coordinate[0], coordinate[1]),
	  //               });
	  //           }

			// 	$scope.$apply(function() {
			// 	    $scope.spots = arr;
			// 	});
			// });
   //  }]);
    app.controller('LogController', ['$scope', 'FusionTable', 'PicasaFactory', 'config', 'db',
		function($scope, FusionTable, Picasa, config, db) {
			$scope.logs = [];
			$scope.albums = [];

			FusionTable.select(config.tables.log)
				.then(function(data) {
					data.forEach(function(el) {
						if ( el.photos == "" )
							el.photos = []
						else
							el.photos = el.photos.split("|");
					});
					$scope.logs = data;
	    		});

    		Picasa.getAlbums()
    			.then(function(albums) {
	    			$scope.albums = albums;
    			})


	    	$scope.addLog = function() {
				$scope.inserted = {
					// id: null,
					Name: '',
					Date: '',
					Photo: '',
					Text: '',
				}
				// $scope.logs.push($scope.inserted);
	    	}

	    	$scope.saveLog = function(data) {
	    		if ( data && $scope.editing ) {
	    			data.Name = $('.typeahead').typeahead('val');
	    			var d = angular.copy(data);
	    			d.photos = d.photos.join("|");

	    			FusionTable.update(config.tables.log, d)
	    				.then(function(res_id) {
	    					$scope.editing = null;
	    				});
	    		}

	    		if ( $scope.inserted )
	    		{
	    			FusionTable.insert(config.tables.log, $scope.inserted)
	    				.then(function(res_id) {
	    					$scope.inserted.id = res_id;
	    					$scope.logs.push($scope.inserted);
	    					$scope.inserted = null;
	    				});
    			}
	    	}

	    	$scope.editLog = function(log) {
	    		// $scope.editing = angular.copy(log);
	    		$scope.editing = log;
				$('.typeahead').typeahead('val', $scope.editing.Name);
		   	}

	    	$scope.cancel = function() {
	    		if ( $scope.inserted )
	    			$scope.inserted = null;
	    		if ( $scope.editing )
	    			$scope.editing = null;
	    	}

	    	$scope.selectAlbum = function() {
	    		console.log($scope.album);
	    		Picasa.getPhotos($scope.album.link)
	    			.then(function(photos) {
	    				$scope.editing.photos = photos;
	    			});
	    	}

			var substringMatcher = function(strs) {
			  return function findMatches(q, cb) {
			    var matches, substrRegex;

			    // an array that will be populated with substring matches
			    matches = [];

			    // regex used to determine if a string contains the substring `q`
			    substrRegex = new RegExp(q, 'i');

			    // iterate through the pool of strings and for any string that
			    // contains the substring `q`, add it to the `matches` array
			    $.each(strs, function(i, str) {
			      if (substrRegex.test(str)) {
			        // the typeahead jQuery plugin expects suggestions to a
			        // JavaScript object, refer to typeahead docs for more info
			        matches.push({ value: str });
			      }
			    });

			    cb(matches);
			  };
			};

			var spots = _.pluck(db.getSpots(), "Name");
	    	$(".typeahead").typeahead({
					hint: true,
	  				highlight: true,
	  				minLength: 1
		    	},
		    	{
					name: 'Name',
  					displayKey: 'value',
  					source: substringMatcher(spots)
	    		}
	    	);
			$('.typeahead').on("typeahead:selected typeahead:autocompleted", function(e) {
				setTimeout(function() {
					$scope.$apply(function() {
						$scope.editing.Name = $('.typeahead').typeahead('val');
					});
				}, 1);
			});

    	}
    ]);
})();