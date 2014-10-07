(function() {
	// var H = H || {};

	// H = {
	// 	substringMatcher: function(strs) {
	// 		return function findMatches(q, cb) {
	// 			var matches, substrRegex;

	// 			// an array that will be populated with substring matches
	// 			matches = [];

	// 			// regex used to determine if a string contains the substring `q`
	// 			substrRegex = new RegExp(q, 'i');

	// 			// iterate through the pool of strings and for any string that
	// 			// contains the substring `q`, add it to the `matches` array
	// 			strs.forEach(function(str) {
	// 				if ( substrRegex.test(str) ) {
	// 					// the typeahead jQuery plugin expects suggestions to a
	// 					// JavaScript object, refer to typeahead docs for more info
	// 					matches.push({ value: str });
	// 				}
	// 			});

	// 			cb(matches);
	// 		};
	// 	},
	// }

    var app = angular.module('seoulscope', ['ngRoute', 'xeditable', 'ngSanitize', 'ui.select']);

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
	        	fields: "name, description, center, zoom, photo, shape",
	        },
	        spot: {
	        	id: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
	        	fields: "name, address, coordinates, area",
	        },
	        log: {
	        	id: "1bW1VuYnupB4thC4iSyhzDxTNwxHTMHm4qHIxxDWc",
	        	fields: "date, time, name, text, photo, photos",
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
			.when('/log/add', {
				templateUrl: 'template/log_form.html',
				controller: 'LogFormController',
			})
			.when('/log/:id/edit', {
				templateUrl: 'template/log_form.html',
				controller: 'LogFormController',
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
					if ( key == 'text' )
						values.push(data[key].replace(/'/g, "\\'"));
					else
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

					if ( key == 'text' )
						fields.push("'"+key+"' = '"+data[key].replace(/'/g, "\\'")+"'")
					else
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
    		var user_id = '101855579290050276785';
    		// var user_id = '107766789599178301880'; // neo

    		var albums = [];

	    	return ({
	    		getAlbums: getAlbums,
	    		createAlbum: createAlbum,
	    		getPhotos: getPhotos,
	    	});

	    	function getAlbums(force) {
	    		var force = force === undefined ? true : force;
	    		var deferred = $q.defer();

	    		if ( force || albums.length == 0 ) {
		    		$http({
		    			url: "https://picasaweb.google.com/data/feed/api/user/"+user_id+"?alt=json",
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

	    	function createAlbum(name) {
// 	    		var xml = "<entry xmlns='http://www.w3.org/2005/Atom' xmlns:media='http://search.yahoo.com/mrss/' xmlns:gphoto='http://schemas.google.com/photos/2007'>
// <title type='text'>Trip To Italy</title>
// <summary type='text'>This was the recent trip I took to Italy.</summary>
// <gphoto:location>Italy</gphoto:location>
// <gphoto:access>public</gphoto:access>
// <gphoto:timestamp>1152255600000</gphoto:timestamp>
// <media:group><media:keywords></media:keywords></media:group>
// <category scheme='http://schemas.google.com/g/2005#kind' term='http://schemas.google.com/photos/2007#album'></category>
// </entry>";
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
	    				folder: d.gphoto$id.$t,
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
		'$scope', 'PicasaFactory',
		function($scope, Picasa) {
			$scope.albums = [];

    		Picasa.getAlbums(false)
    			.then(function(albums) {
	    			$scope.albums = albums;
    			})
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
					name: '',
					address: '',
					coordinates: '',
					area: '',
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

    app.service('LogService', [
    	'config', 'FusionTableFactory', '$q',
    	function(config, FusionTable, $q) {
			var ftTable = new FusionTable(config.tables.log);
			var logs = [];

			this.getLogs = function() {
				return ftTable.select()
					.then(function(data) {
						data.forEach(function(el) {
							if ( el.photos == "" )
								el.photos = []
							else
								el.photos = el.photos.split("\n");
						});

						logs = data;
						return logs;
		    		});
			}

    		this.addLog = function() {
    			return {
					name: '',
					date: '',
					time: '00:00',
					photo: '',
					photos: [],
					text: '',
    			}
    		}

    		this.editLog = function(id) {
    			return angular.copy(_.where(logs, {id: id})[0]);
    		}

    		this.insert = function(data) {
    			data.photos = data.photos.join("\n");

				return ftTable.insert(data)
					.then(function(res_id) {
						data.id = res_id;
						return data;
					});
    		}

    		this.update = function(data) {
    			data.photos = data.photos.join("\n");

				return ftTable.update(data)
					.then(function() {
						return data;
					});
			}
    	}
    ]);

    app.controller('LogController', [
    	'$scope', 'LogService', 'FusionTableFactory', 'DbService', 'config', 'PicasaFactory', '$location',
		function($scope, Log, FusionTable, Db, config, Picasa, $location) {
			var ftTable = new FusionTable(config.tables.log);
			var spots = Db.getSpots();

			$scope.logs = [];
			// $scope.albums = [];

			Log.getLogs()
				.then(function(data) {
					$scope.logs = data;
				})

	    	$scope.addLog = function() {
				$location.path('log/add');
	    	}

	    	$scope.editLog = function(log) {
	    		// $scope.editing = angular.copy(log);
	    		// $scope.editing = log;
				// $('.typeahead').typeahead('val', $scope.editing.Name);
				// console.log('log/'+log.id+'/edit');
				$location.path('log/'+log.id+'/edit');
		   	}

	    	$scope.getSpots = function() {
	    		return Db.getSpots();
	    	}

	    	// $scope.selectSpot = function() {
	    	// 	$scope.editing.name = $scope.editingForm.selSpot.$viewValue.name;
	    	// }

	    	// $scope.selectAlbum = function() {
	    	// 	$scope.editing.photo = $scope.album.folder;
	    	// 	Picasa.getPhotos($scope.album.link)
	    	// 		.then(function(photos) {
	    	// 			$scope.editing.photos = photos;
	    	// 		});
	    	// }
    	}
    ]);

    app.controller('LogFormController', [
    	'$scope', '$routeParams', '$location', 'DbService', 'LogService', 'PicasaFactory',
    	function($scope, $routeParams, $location, Db, Log, Picasa) {
    		$scope.data = null;

    		if ( !$routeParams.id ) {
    			$scope.data = Log.addLog();
    		}
			else {
    			$scope.data = Log.editLog($routeParams.id);
			}

	    	$scope.getSpots = function() {
	    		return Db.getSpots();
	    	}

	    	$scope.selectSpot = function() {
	    		$scope.data.name = $scope.logForm.selSpot.$viewValue.name;
	    	}

	    	$scope.getAlbumName = function() {
	    		return $scope.data.name + '_' + $scope.data.date.replace(/-/g, '');
	    	}

	    	$scope.createAlbum = function() {
	    		// Picasa.createAlbum($scope.getAlbumName())
	    		// 	.then(function(id) {
	    		// 		console.log(id);
	    		// 	});
	    	}

	    	$scope.selectAlbum = function() {
	    		$scope.data.photo = $scope.album.folder;
	    		Picasa.getPhotos($scope.album.link)
	    			.then(function(photos) {
	    				$scope.data.photos = photos;
	    			});
	    	}

	    	$scope.saveLog = function(data) {
	    		// Log.save(data)
	    		// 	.then($location.path('log');)
	    		if ( !data.id ) {
	    			Log.insert(data)
	    				.then(function() {
				    		$location.path('log');
	    				});
	    		}
	    		else {
	    			Log.update(data)
	    				.then(function() {
				    		$location.path('log');
	    				});
	    		}
	    	}

	    	$scope.cancel = function() {
	    		$location.path('log');
	    	}
    	}
    ]);
})();