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
	        	fields: "name, description, center, zoom, photo, shape, city",
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
    	STATUS: {
    		LOADING: 'loading',
			FIXED: 'fixed',
			NEW: 'new',
			UPDATING: 'updating',
			ERROR: 'error',
    	}
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
			.when('/spot/add', {
				templateUrl: 'template/spot_form.html',
				controller: 'SpotFormController',
			})
			.when('/spot/:id/edit', {
				templateUrl: 'template/spot_form.html',
				controller: 'SpotFormController',
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
				resolve: {
					load: function(LogService) {
						return LogService.load();
					}
				}
			})
    });

	app.service('root', [
		'$rootScope', '$location', 'AuthService', 'DbService', 'LogService',
		function($rootScope, $location, Auth, Db, Log) {
			var hash = null;

			$rootScope.currentUser = null;

			$rootScope.login = function(imm) {
				hash = window.location.hash;
				window.location.hash = "";
				document.getElementById("loader").classList.add("show");

				Auth.authorize(imm)
					.then(
						function() {
							Db.load();
							Log.getLogs();

							$rootScope.currentUser = Auth.currentUser;
							document.getElementById("loader").classList.remove("show");
							if ( hash )
								$location.path(hash.replace("#", ""));
						},
						function() {
							document.getElementById("loader").classList.remove("show");
						}
					)
					// .then(function() {
					// 	$rootScope.currentUser = Auth.currentUser;
					// 	document.getElementById("loader").classList.remove("show");
					// 	if ( hash )
					// 		$location.path(hash.replace("#", ""));
					// })
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
				console.log('>>> authorizing...');
				gapi.auth.authorize({
						response_type: "token",
						client_id: config.client_id,
						scope: config.scope,
						immediate: imm,
					},
					function(response) {
						if ( response && !response.error ) {
							console.log('  Success.');
							self.currentUser = {
								id: null,
								name: 'g',
								token: response.access_token,
								token_type: response.token_type,
							}

							console.log('>>> get user id...');
							$http({
								url: "https://www.googleapis.com/plus/v1/people/me?fields=id&key=" + config.api_key,
								headers: {'authorization': self.currentUser.token_type + ' ' + self.currentUser.token},
							})
							.then(function(response) {
								console.log('  Success.');
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
		'$q', 'config', 'FusionTableFactory', 'SpotManager',
		function($q, config, FusionTable, Spots) {
			// var self = this;
			var loaded = false;

			var domains = [];
			var zones = [];

			this.getDomains = function() {
				return domains;
			}

			this.getZones = function() {
				return zones;
			}

			this.getSpots = function() {
				return Spots.list();
			}

			this.load = function() {
				var deferred = $q.defer();

				// 새로 로그인해도 새로 가져오기.
				if ( false && loaded ) {
					deferred.resolve();
				}
				else {
					console.log('retrieve data...');
					var promises = [
						FusionTable.select(config.tables.domain),
						FusionTable.select(config.tables.zone),
						Spots.load(),
					]

					$q.all(promises)
						.then(
							function(results) {
								console.log('  Success(retrieve data).');

								results[0].forEach(function(el) {
									domains.push(el);
								});
								results[1].forEach(function(el) {
									zones.push(el);
									console.log(el);
								});
								// console.log(results[2]);

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
				// _.map(data.rows, function(row) {
				// 	var o = {id: data.rows[0]};
				// 	for ( var j = 1, len = data.columns.length ; j < len2 ; j++ )
				// 		o[data.columns[j]] = data.rows[i][j];
				// })
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
				console.log('>>> get picasa album...');

	    		var force = force === undefined ? true : force;
	    		var deferred = $q.defer();

	    		if ( force || albums.length == 0 ) {
		    		$http({
		    			url: "https://picasaweb.google.com/data/feed/api/user/"+user_id+"?alt=json",
		    		})
						.then(
							function(response) {
								console.log('  Success(get picasa album).');
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
		'$scope', 'config', 'PicasaFactory',
		function($scope, config, Picasa) {
			$scope.albums = [];

    		Picasa.getAlbums(false)
    			.then(function(albums) {
	    			$scope.albums = albums;
    			})

			$scope.getStatusClass = function(status) {
				switch ( status ) {
					case config.STATUS.UPDATING:
						return 'info';
					case config.STATUS.ERROR:
						return 'error';
					default:
						return '';
				}
			}
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

    app.service('SpotManager', [
    	'$q', 'FusionTableFactory', 'config', 'SpotModel',
    	function($q, FusionTable, config, Spot) {
			var _ftTable = new FusionTable(config.tables.spot);
			var _index = {};
    		var _spots = [];
    		var _deferred = $q.defer();

    		function _getInstance(id) {
    			var instance = _index[id];

				if ( !instance ) {
	                instance = new Spot();
	                instance._status = config.STATUS.LOADING;

	                _index[id] = instance;
	            }

	            return instance;
    		}

    		this.load = function() {
    			var scope = this;

	    		_ftTable.select()
	    			.then(function(rows) {
	    				rows.forEach(function(row) {
	    					var spot = _getInstance(row.id);
	    					spot.setData(row);
			                spot._status = config.STATUS.FIXED;
			                if ( spot._deferred )
	    						spot._deferred.resolve(spot.copy());

	    					_spots.push(spot);
	    				})

	    				_deferred.resolve(scope);
	    			});

	    		return _deferred.promise;
	    	}

    		this.list = function() {
    			return _spots;
    		}

    		this.find = function(id) {
    			return _getInstance(id);
    		};

    		this.copy = function(id) {
    			var spot = _getInstance(id);

    			if ( !spot._deferred )
    				spot._deferred = $q.defer();

    			if ( spot._status != config.STATUS.LOADING ) {
    				spot._deferred.resolve(spot.copy());
    			}

    			return spot._deferred.promise;
    		};

    		this.save = function(data) {
    			var spot;
    			var req;

	    		if ( !data.id ) {
	    			spot = new Spot();
	    			_spots.push(spot);

					req = _ftTable.insert(data);
	    		}
	    		else {
	    			var spot = this.find(data.id);

					req = _ftTable.update(data);
	    		}

				spot.setData(data);
    			spot._status = config.STATUS.UPDATING;
    			if ( spot._deferred ) {
    				spot._deferred.reject();
					delete spot._deferred;
    			}

				req.then(
					function(id) {
						if ( !spot.id ) {
							spot.id = id;
							_index[id] = spot;
						}
						spot._status = config.STATUS.FIXED;
					},
					function() {
						spot._status = config.STATUS.ERROR;
					}
				);
			}
		}
    ]);

	// id는 못 바꾸게 하면 좋겠네요.
    app.factory('SpotModel', [
    	function() {
	    	function Spot(data) {
	    		if ( data )
	    			this.setData(data);
	    	};

	    	Spot.prototype = {
	    		setData: function(data) {
	    			angular.extend(this, data);
	    		},
	    		copy: function() {
	    			var copied = {};

	    			for ( var k in this ) {
						if ( this.hasOwnProperty(k) && k.indexOf('_') != 0 )
							copied[k] = this[k];
	    			}

	    			return copied;
	    		}
	    	}

	    	return Spot;
	    }
    ]);

    app.controller('SpotController', [
    	'$scope', '$location', 'DbService',
		function($scope, $location, Db) {
			$scope.spots = Db.getSpots();

	    	$scope.editSpot = function(spot) {
				$location.path('spot/'+spot.id+'/edit');
		   	}
    	}
    ]);

    app.controller('SpotFormController', [
    	'$scope', '$routeParams', '$location', 'SpotManager', 'DbService', 'FusionTableFactory', 'config',
    	// '$scope', '$routeParams', '$location', 'DbService', 'LogService', 'PicasaFactory',
		function($scope, $routeParams, $location, Spots, Db, FusionTable, config) {
			var ftTable = new FusionTable(config.tables.spot);

			$scope.data = {
				id: null,
				name: '',
				address: '',
				coordinates: '',
				area: '',
			}

    		if ( $routeParams.id ) {
    			Spots.copy($routeParams.id)
    				.then(function(copied) {
						angular.extend($scope.data, copied);
    				});
			}

			$scope.getZones = function() {
				return Db.getZones();
			}

	    	$scope.save = function(data) {
	    		Spots.save(data);

	    // 		if ( !data.id ) {
	    // 			var spot = angular.copy(data);
	    // 			// spot._status =
					// Spot.add(spot);

					// req = ftTable.insert(data);
	    // 		}
	    // 		else {
	    // 			// var spot = Db.findSpot();
	    // 			// var spot = _.where($scope.spots, {id: data.id});
	    // 			// spot._status =
	    // 			var spot = Spot.find(data.id);
	    // 			// spot._status =
					// for ( var key in spot )
					// 	$spot[key] = data[key];

					// req = ftTable.update(data);
	    // 		}

	    		// req.then(function(res) {
	    		// });

	    		$location.path('spot');
	    	}

	    	$scope.cancel = function() {
	    		$location.path('spot');
	    	}
    	}
    ]);

    app.service('LogService', [
    	'config', 'FusionTableFactory', '$q',
    	function(config, FusionTable, $q) {
    		var STATUS = {
    			FIXED: 'fixed',
    			NEW: 'new',
    			UPDATING: 'updating',
    			ERROR: 'error',
    		}
			var ftTable = new FusionTable(config.tables.log);
			var logs = [];
			var deferred = $q.defer();
			var loading = false;

			this.load = function() {
				if ( !loading ) {
					loading = true;

					console.log('retrieve log data...');
					ftTable.select()
						.then(function(data) {
							console.log('  Success(retrieve log data).');
							data.forEach(function(el) {
								el._status = STATUS.FIXED;

								if ( el.photos == "" )
									el.photos = []
								else
									el.photos = el.photos.split("\n");

								// logs.push(el);
							});

							angular.copy(data, logs);

							deferred.resolve();
			    		});
				}

				return deferred.promise;
			}

			this.getLogs = function() {
				if ( logs.length == 0 )
					this.load();

		  		return logs;
			}

			this.findLog = function(id) {
    			return _.where(logs, {id: id})[0];
			}

    		this.newLog = function() {
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
    			var log = this.findLog(id);
    			var data = angular.copy(this.findLog(id));

    			delete data._status;

    			return data;
    		}

    		this.save = function(data) {
				data.photos = data.photos.join("\n");

				var log = null;
				var req = null;

	    		if ( !data.id ) {
					var log = angular.copy(data);
					logs.push(log);

					req = ftTable.insert(data);
				}
				else {
	    			log = this.findLog(data.id);
	    			angular.copy(data, log);

					req = ftTable.update(data);
				}

				log._status = STATUS.UPDATING;

				req.then(
					function(id) {
						if ( !log.id )
							log.id = id;
						log._status = STATUS.FIXED;
					},
					function() {
						log._status = STATUS.ERROR;
					}
				);
    		}
    	}
    ]);

    app.controller('LogController', [
    	'$scope', '$location', 'LogService',
		function($scope, $location, Log) {
			$scope.logs = Log.getLogs();

			$scope.getStatusClass = function(log) {
				switch ( log._status ) {
					case 'updating':
						return 'info';
					case 'error':
						return 'error';
					default:
						return '';
				}
			}

	    	$scope.editLog = function(log) {
				$location.path('log/'+log.id+'/edit');
		   	}
    	}
    ]);

    app.controller('LogFormController', [
    	'$scope', '$routeParams', '$location', 'DbService', 'LogService', 'PicasaFactory',
    	function($scope, $routeParams, $location, Db, Log, Picasa) {
    		$scope.data = Log.newLog();

    		if ( $routeParams.id ) {
    			angular.copy(Log.editLog($routeParams.id), $scope.data);
    		}

			$scope.getTimes = function() {
				var times = [];
				for ( var i = 0 ; i < 24 ; i++ ) {
					var hour = i < 10 ? '0'+i : '' + i;

					times.push(hour + ':00');
					// times.push(hour + ':30');
				}

				return times;
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

	    	$scope.save = function(data) {
	    		Log.save(data);
	    		$location.path('log');
	    	}

	    	$scope.cancel = function() {
	    		$location.path('log');
	    	}
    	}
    ]);
})();