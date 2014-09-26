(function() {
	var H = H || {};

	H = {
		substringMatcher: function(strs) {
			return function findMatches(q, cb) {
				var matches, substrRegex;

				// an array that will be populated with substring matches
				matches = [];

				// regex used to determine if a string contains the substring `q`
				substrRegex = new RegExp(q, 'i');

				// iterate through the pool of strings and for any string that
				// contains the substring `q`, add it to the `matches` array
				strs.forEach(function(str) {
					if ( substrRegex.test(str) ) {
						// the typeahead jQuery plugin expects suggestions to a
						// JavaScript object, refer to typeahead docs for more info
						matches.push({ value: str });
					}
				});

				cb(matches);
			};
		},
	}

    var app = angular.module('seoulscope', ['ngRoute', 'xeditable']);

    app.constant('config', {
    	api_key: "AIzaSyCUphKCCMUpng-f3DZEiCGhT8j06GliYRo",
		client_id: "523831962603-epe6gir9d2q4pjv08kgo4nn75ogguj8c.apps.googleusercontent.com",
		scope: "https://www.googleapis.com/auth/plus.me https://www.googleapis.com/auth/fusiontables https://picasaweb.google.com/data/",
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
			.when('/spot', {
				templateUrl: 'template/spot.html',
				controller: 'SpotController',
			})
			.when('/log', {
				templateUrl: 'template/log.html',
				controller: 'LogController',
			})
    });

	app.service('root', [
		'$rootScope', '$location', 'AuthService', 'DbService',
		function($rootScope, $location, Auth, Db) {
			var hash = null;

			$rootScope.currentUser = null;

			$rootScope.login = function(imm) {
				hash = window.location.hash;
				window.location.hash = "";
				document.getElementById("loader").classList.add("show");

				Auth.authorize(imm)
					.then(
						function() {
							return Db.load();
						},
						function() {
							document.getElementById("loader").classList.remove("show");
						}
					)
					.then(function() {
						$rootScope.currentUser = Auth.currentUser;
						document.getElementById("loader").classList.remove("show");
						if ( hash )
							$location.path(hash.replace("#", ""));
					})
			}

			$rootScope.logout = function() {
				document.getElementById("loader").classList.add("show");

				Auth.disconnect()
					.then(function() {
						$rootScope.currentUser = null;
						document.getElementById("loader").classList.remove("show");
					});
			}

			return $rootScope;
		}
	]);

	app.run([
		'root', 'editableOptions', 'editableThemes',
		function(root, editableOptions, editableThemes) {
			editableThemes.bs3.inputClass = 'input-sm';
			editableThemes.bs3.buttonsClass = 'btn-sm';
			editableOptions.theme = 'bs3';

			root.login(true);
		}
	]);

	app.service('AuthService', [
		'config', '$q', '$http',
    	function(config, $q, $http) {
    		var self = this;

    		this.currentUser = null;

    		this.authorize = function(imm) {
				var deferred = $q.defer();

				gapi.client.setApiKey(config.api_key);
				gapi.auth.authorize({
						response_type: "token",
						client_id: config.client_id,
						scope: config.scope,
						immediate: imm,
					},
					function(response) {
						if ( response && !response.error ) {
							self.currentUser = {
								id: null,
								name: 'g',
								token: response.access_token,
								token_type: response.token_type,
							}

							$http({
								url: "https://www.googleapis.com/plus/v1/people/me?fields=id&key=" + config.api_key,
								headers: {'authorization': self.currentUser.token_type + ' ' + self.currentUser.token},
							})
							.then(function(response) {
								self.currentUser.id = response.data.id;
								deferred.resolve();
							});
						} else {
							if ( response )
								console.log(response.error);

							deferred.reject("Authorization Failed!");
						}

					}
				);

				return deferred.promise;
			};

			this.disconnect = function() {
				var revokeUrl = 'https://accounts.google.com/o/oauth2/revoke?token=' + self.currentUser.token + '&callback=JSON_CALLBACK';

				var req = $http.jsonp(revokeUrl)
					.then(
						function(res) {
							self.currentUser = null;
						},
						function(res) {
							self.currentUser = null;
							console.log(res.data);
						}
					);

				return req;
			}
    	}
    ]);

	app.service('DbService', [
		'config', 'FusionTableFactory', '$q',
		function(config, FusionTable, $q) {
			var self = this;
			var loaded = false;

			var domains = [];
			var zones = [];
			var spots = [];

			this.getDomains = function() {
				return domains;
			}

			this.getZones = function() {
				return zones;
			}

			this.getSpots = function() {
				return spots;
			}

			this.load = function() {
				var deferred = $q.defer();

				// 새로 로그인해도 새로 가져오기.
				if ( false && loaded ) {
					deferred.resolve();
				}
				else {
					FusionTable.select(config.tables.domain)
						.then(
							function(data) {
								domains = data;
								return FusionTable.select(config.tables.zone);
			    			},
			    			function() {
			    				deferred.reject();
			    			}
			    		)
			    		.then(
			    			function(data) {
				    			zones = data;
								return FusionTable.select(config.tables.spot);
			    			},
			    			function() {
			    				deferred.reject();
			    			}
			    		)
			    		.then(
		    				function(data) {
				    			spots = data;
				    			loaded = true;

				    			deferred.resolve();
			    			},
			    			function() {
			    				deferred.reject();
			    			}
			    		)
			    }

		    	return deferred.promise;
	    	}
		}
	]);

    app.factory('FusionTableFactory', [
    	'$http', 'config', 'AuthService',
    	function($http, config, Auth) {
    		function execute(query) {
				return $http({
					url: 'https://www.googleapis.com/fusiontables/v1/query?sql=' + encodeURIComponent(query) + '&key=' + config.api_key,
					method: 'post',
					headers: {'authorization': 'Bearer ' + Auth.currentUser.token},
				});
    		}

	    	function select(table) {
			    var query = "SELECT ROWID, " + table.fields + " FROM " + table.id;
				var req = execute(query);

			    return req
			    	.then(
				    	onSelectSuccess,
				    	function(error) {
				    		console.log(error);
				    	}
			    	)
			}

			function insert(table, data) {
				var fields = [], values = [];
				for ( var key in data ) {
					if ( !data.hasOwnProperty(key) )
						continue;

					fields.push(key);
					values.push(data[key]);
				}

			    var query = "INSERT INTO "+table.id+" ('"+fields.join("','")+"') VALUES ('"+values.join("','")+"')";
				var req = execute(query);

			    return req
			    	.then( onInsertSuccess );
			}

			function update(table, data) {
				var fields = [];
				for ( var key in data ) {
					if ( !data.hasOwnProperty(key) || key == 'id')
						continue;

					fields.push("'"+key+"' = '"+data[key]+"'")
				}

			    var query = "UPDATE "+table.id+" SET "+fields.join(',')+" WHERE ROWID = '"+data.id+"'";
				var req = execute(query);

			    return req;
			}

			function _delete(table, data) {
			    var query = "DELETE FROM "+table.id+" WHERE ROWID = '"+data.id+"'";
				var req = execute(query);

			    return req;
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

	    	var ft = function(tablename) {
    			var table = tablename;

		    	this.select = function() {
		    		return select(tablename);
		    	};

		    	this.insert = function(data) {
		    		return insert(tablename, data);
		    	};

		    	this.update = function(data) {
		    		return update(tablename, data);
		    	};

		    	this.delete = function(data) {
		    		return _delete(tablename, data);
		    	};
    		};
    		ft.select = select;

    		return ft;
    	}
    ]);

	// TODO Factory!!!! --> Service
    app.factory('PicasaFactory', [
    	'$http', '$q', 'AuthService',
    	function($http, $q, Auth) {
    		var albums = [];

	    	return ({
	    		getAlbums: getAlbums,
	    		getPhotos: getPhotos,
	    	});

	    	function getAlbums(force) {
	    		var force = force === undefined ? true : force;
	    		var deferred = $q.defer();

	    		if ( force || albums.length == 0 ) {
		    		$http({
		    			url: "https://picasaweb.google.com/data/feed/api/user/" + Auth.currentUser.id + '?alt=json',
		    		})
						.then(
							function(response) {
		    					onGetAlbums(response);
		    					deferred.resolve(albums);
		    				}
		    			)
				}
				else {
					deferred.resolve(albums);
				}

	    		return deferred.promise;
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

	app.controller('BaseController', [
		'$scope',
		function($scope) {
		}
	]);

    app.controller('DomainController', [
    	'$scope', 'FusionTableFactory', 'DbService', 'config',
		function($scope, FusionTable, Db, config) {
			var ftTable = new FusionTable(config.tables.domain);

			$scope.domains = Db.getDomains();

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
	    			// or ...
	    			// FusionTable.table(config.tables.domain).values.(data).where(id).update();
	    			data.id = id;
	    			ftTable.update(data);
	    		}
	    		else {
	    			// FusionTable.table(config.tables.domain).values(data).insert();
	    			ftTable.insert(data)
	    				.then(function(res_id) {
	    					$scope.inserted.id = res_id;
	    				});
	    		}
	    	}

			$scope.addDomain();
    	}
    ]);

    app.controller('ZoneController', [
    	'$scope', 'FusionTableFactory', 'DbService', 'config',
		function($scope, FusionTable, Db, config) {
			var ftTable = new FusionTable(config.tables.zone);

			$scope.zones = Db.getZones();

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
	    			ftTable.update(data);
	    		}
	    		else {
	    			ftTable.insert(data)
	    				.then(function(res_id) {
	    					$scope.inserted.id = res_id;
	    				});
	    		}
	    	}

	    	$scope.addZone();
    	}
    ]);

    app.controller('SpotController', [
    	'$scope', 'FusionTableFactory', 'DbService', 'config',
		function($scope, FusionTable, Db, config) {
			var ftTable = new FusionTable(config.tables.spot);

			$scope.spots = Db.getSpots();

	    	$scope.addSpot = function() {
				$scope.inserted = {
					id: null,
					Name: '',
					Address: '',
					Coordinates: '',
					Area: '',
				}
				$scope.spots.push($scope.inserted);
	    	}

	    	$scope.saveSpot = function(data, id) {
	    		if ( id ) {
	    			data.id = id;
	    			ftTable.update(data);
	    		}
	    		else {
	    			ftTable.insert(data)
	    				.then(function(res_id) {
	    					$scope.inserted.id = res_id;
	    				});
	    		}
	    	}

	    	$scope.addSpot();
    	}
    ]);

    app.controller('LogController', [
    	'$scope', 'FusionTableFactory', 'DbService', 'config', 'PicasaFactory',
		function($scope, FusionTable, Db, config, Picasa) {
			var ftTable = new FusionTable(config.tables.log);
			var spots = Db.getSpots();

			$scope.logs = [];
			$scope.albums = [];

			ftTable.select()
				.then(function(data) {
					data.forEach(function(el) {
						if ( el.photos == "" )
							el.photos = []
						else
							el.photos = el.photos.split("|");
					});
					$scope.logs = data;
	    		});

    		Picasa.getAlbums(false)
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

			var spot_names = _.pluck(spots, "Name");
	    	$(".typeahead").typeahead({
					hint: true,
	  				highlight: true,
	  				minLength: 1
		    	},
		    	{
					name: 'Name',
  					displayKey: 'value',
  					source: H.substringMatcher(spot_names)
	    		}
	    	);
	    	// 불필요한 듯.
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