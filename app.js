var g;

(function() {
    var h = 40;

    window.scrollTo(0, 1);

    var app = angular.module('seoulscope', ['ngRoute', 'ngAnimate']);

    app.constant('config', {
        api_key: "AIzaSyCUphKCCMUpng-f3DZEiCGhT8j06GliYRo",
        tables: {
            domain: {
                id:  "1wyHT6nLOpM57AbT0dyS86Bz6f-bxP6mpv2Qw4vlm",
                name: 'domain',
                fields: "name, description, center, zoom, 'order'",
            },
            zone: {
                id: "1mIutuGqnSYRGz7hrWn__Ll-Xq-Ru-5amqoBJHiXU",
                name: 'zone',
                fields: "name, description, center, zoom, photo, shape, city",
            },
            spot: {
                id: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
                name: 'spot',
                fields: "name, address, coordinates, stars, area",
            },
            log: {
                id: "1bW1VuYnupB4thC4iSyhzDxTNwxHTMHm4qHIxxDWc",
                name: 'log',
                fields: "date, name, text, photo, photos",
            }
        },
        map: {
            center: {lat:37.566535, lng:126.9779692},
            zoom: 12,
        },
        caching: false && (window.host != 'snailzzang.github.io'),
    });

    app.config(function($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'template/home.html',
                controller: 'HomeController',
            })
            .when('/zone/:zone_name', {
                templateUrl: 'template/zone.html',
                controller: 'ZoneController',
            })
            .when('/spot/:spot_name', {
                templateUrl: 'template/spot.html',
                controller: 'SpotController',
            })
            // .otherwise(
            // )
    });

    app.directive('ssLazyImage', function() {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.bind('load', function() {
                    // console.log(1);
                    // //call the function that was passed
                    // scope.$apply(attrs.imageonload);
                });
            }
        };
    })

    app.run(['StorageService', '$location', '$rootScope', 'MapService',
        function(Storage, $location, $rootScope, Map) {
            var loc = decodeURI(window.location.hash);
            window.location.hash = '';

            // 왠지 animation 걸면 해결 될 듯.
            $rootScope.$on('$routeChangeSuccess', function() {
                var container = document.getElementById('page-container');

                setTimeout(function() {
                    container.style.display = 'block';
                    container.scrollTop = 0;
                }, 10);

                container.style.display = 'none';
                document.getElementById('page-container').scrollTop = 0;
            });

            Storage.load()
                .then(function() {
                    if ( loc )
                        $location.path(loc.replace('#', ''));

                    if ( window.matchMedia('(max-device-width: 730px)').matches ) {
                        var documentTap = function(e) {
                            if ( e.target && e.target.tagName != "A" && e.target.tagName != "H1" && e.target.tagName != "BUTTON" )
                                $rootScope.$broadcast("toggle", {});
                        }

// angular way...
// angular.element($window).bind

                        // var scroll = function() {
                        //     var page = document.getElementById('page-container');
                        //     var header = document.getElementById('page-header');
                        //     var prevTop = 0;
                        //     var scrolling = false;

                        //     page.addEventListener('scroll', function(e) {
                        //         scrolling = true;
                        //     });

                        //     function scrolled() {
                        //         var top = page.scrollTop;

                        //         if ( Math.abs(prevTop - top) <= 5 )
                        //             return;

                        //         // If they scrolled down and are past the navbar, add class .nav-up.
                        //         // This is necessary so you never see what is "behind" the navbar.
                        //         if ( top > prevTop && top > 40 ) {
                        //             // $('header').removeClass('nav-down').addClass('nav-up');
                        //             // header.style.top = '-40px';
                        //             // header.classList.remove('show');
                        //             header.classList.add('hide');
                        //         } else if ( top > 40 ) {
                        //             header.classList.remove('hide');
                        //             // if ( top + $(window).height() < $(document).height() ) {
                        //             //     $('header').removeClass('nav-up').addClass('nav-down');
                        //             // }
                        //         }

                        //         prevTop = top;
                        //     }

                        //     setInterval(function() {
                        //         if ( scrolling ) {
                        //             scrolled();
                        //             scrolling = false;
                        //         }
                        //     }, 250);
                        // };
                        // scroll();

                        var ham = function() {
                            var tx = 0;
                            var page = document.getElementById("page-container");
                            var w = window.innerWidth;

                            delete Hammer.defaults.cssProps.userSelect;
                            Hammer.defaults.touchAction = 'pan-y';

                            Hammer(page).on("tap", documentTap);
                            Hammer(document.getElementById("nav-domain")).on("tap", documentTap);

                            // function transform(el, transform) {
                            //     el.style.webkitTransform = transform;
                            //     el.style.transform = transform;
                            // }

                            // Hammer(page).on('panstart panmove', function(e) {
                            // console.log(e.deltaY);
                            //     var x = tx + e.deltaX;
                            //     if ( x < 0 )
                            //         x = 0;
                            //     if ( x > w - 40 )
                            //         x = w - 40;

                            //     transform(page, 'translate('+x+'px, 0)');
                            // })

                            // Hammer(page).on('panend', function(e) {
                            //     tx += e.deltaX;
                            //     if ( tx < w / 2 )
                            //         tx = 0;
                            //     else
                            //         tx = w - 60;

                            //     transform(page, 'translate('+(tx)+'px, 0)');
                            // })
                        }
                        ham();
                    }

                    Map.init(document.getElementById("map-canvas"));
                });
        }
    ]);

    app.service('FusionTableService', [
        '$http', '$q', 'config',
        function($http, $q, config) {
            function onSelectSuccess(response) {
                var data = response.data;
                var rows = [];
                for ( var i = 0, len = data.rows.length; i < len ; i++ ) {
                    // var o = {id: data.rows[i][0]};
                    var o = {};
                    for ( var j = 0, len2 = data.columns.length ; j < len2 ; j++ )
                        o[data.columns[j]] = data.rows[i][j];

                    rows.push(o);
                }

                return rows;
            }

            this.select = function(table, opt) {
                var deferred = $q.defer();
                // var ft_expires = sessionStorage.getItem('ft_expires');

                // if ( !!ft_expires && )

                var rows = sessionStorage.getItem('FT_'+table.name);
                if ( config.caching && !!rows ) {
                    deferred.resolve(JSON.parse(sessionStorage.getItem('FT_'+table.name)));
                }
                else {
                    var query = "SELECT " + table.fields + " FROM " + table.id;

                    var req = $http({
                        url: 'https://www.googleapis.com/fusiontables/v1/query?sql=' + encodeURIComponent(query) + '&key=' + config.api_key,
                    });

                    req.then(
                        function(response) {
                            var rows = onSelectSuccess(response);
                            sessionStorage.setItem('FT_'+table.name, JSON.stringify(rows));
                            deferred.resolve(rows);
                        },
                        function(response) {console.log(response)}
                    );
                }

                return deferred.promise;
            }
        }
    ]);

    app.service('StorageService', [
        '$http', '$q', 'FusionTableService', 'config',
        function($http, $q, FusionTable, config) {
            var self = this;

            var domains = [];
            var zones = [];
            var spots = [];
            var logs = [];

            this.getDomain = function(name) {
                return _.where(domains, {name: name});
            }

            this.getDomains = function() {
                return domains;
            }

            this.getZone = function(name) {
                return _.where(zones, {name: name});
            }

            this.getZones = function(domain) {
                if ( !domain )
                    return zones;

                return _.where(zones, {city: domain});
            }

            this.getSpot = function(name) {
                return _.where(spots, {name: name});
            }

            this.getSpots = function(zone) {
                if ( !zone )
                    return spots;

                return _.where(spots, {area: zone});
            }

            this.getLogs = function(date) {
                if ( !date )
                    return logs;

                return _.where(logs, {date: date});
            }

            this.getDates = function() {
                return _.uniq(_.pluck(logs, 'date'));
            }

            this.load = function() {
                var deferred = $q.defer();

                FusionTable.select(config.tables.domain)
                    .then(
                        function(rows) {
                            domains = rows;
                            _.forEach(domains, function(el) {
                                el.order = parseInt(el.order);
                            });
                            domains = domains.sort(function(a, b) {
                                if (a.order < b.order) {
                                    return -1;
                                }
                                if (a.order > b.order) {
                                    return 1;
                                }

                                return 0;
                            });

                            return FusionTable.select(config.tables.zone)
                        }
                    )
                    .then(
                        function(rows) {
                            zones = rows;
                            return FusionTable.select(config.tables.spot)
                        }
                    )
                    .then(
                        function(rows) {
                            spots = rows;
                            spots.forEach(function(el) {
                                el.stars = parseInt(el.stars);
                            });
                            return FusionTable.select(config.tables.log)
                        }
                    )
                    .then(
                        function(rows) {
                            logs = rows.sort(function(a, b) {
                                if (a.date > b.date) {
                                    return -1;
                                }
                                if (a.date < b.date) {
                                    return 1;
                                }

                                return 0;
                            });
                            _.forEach(logs, function(el) {
                                el.name = el.name.trim();
                                if ( el.photos == '' )
                                    el.photos = []
                                else
                                    el.photos = el.photos.split('\n');

                                el.text = el.text.split("\n");
                            })

                            deferred.resolve();
                        }
                    )

                return deferred.promise;
            }
        }
    ]);

    app.service('MapService', [
        'config',
        function(config) {
            var _center = new google.maps.LatLng(config.map.center.lat, config.map.center.lng);
            var _map;
            var _mapOptions = {
                center: _center,
                zoom: config.map.zoom,
                // minZoom: config.map.zoom,

                // overviewMapControl: true,
                panControl: false,
                // mapTypeControl: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControlOptions: {
                    // mapTypeIds: _layers,
                    position: google.maps.ControlPosition.TOP_LEFT,
                },
            };
            google.maps.visualRefresh = true;

            this.init = function(el) {
                _map = new google.maps.Map(el, _mapOptions);
            }

            this.moveTo = function(center, zoom) {
                if ( !angular.isArray(center) ) {
                    center = center.split(',');
                    center = new google.maps.LatLng(center[0], center[1]);
                }

                _map.setCenter(center);
                _map.setZoom(parseInt(zoom));
            }
        }
    ]);

    app.controller('BaseController', [
        '$scope',
        function($scope) {
            var mapIsVisible = false;

            $scope.showDomainNav = !window.matchMedia('(max-device-width: 730px)').matches;

            $scope.$on("toggle", function() {
                $scope.$apply(function() {
                    $scope.showDomainNav = !$scope.showDomainNav;
                });
            });

            $scope.toggleMap = function() {
                var page = document.getElementById('page-container');

                mapIsVisible = !mapIsVisible;

                if ( mapIsVisible ) {
                    page.style.webkitTransform = 'translate(280px, 0)';
                    page.style.transform = 'translate(280px, 0)';
                }
                else {
                    page.style.webkitTransform = 'translate(0, 0)';
                    page.style.transform = 'translate(0, 0)';
                }
            }
        }
    ]);

    app.controller('NavLogController', [
        '$scope', 'StorageService', 'MapService', '$filter',
        function($scope, Storage, Map, $filter) {
            var d = new Date((new Date().getFullYear()), 0, 1);
            $scope.today = $filter('date')(new Date(), 'yyyy-MM-dd');
            $scope.ticks = _.range(12).map(function(el) {
                return d.getFullYear() + '-' + (el+1) + '-01';
            });
            $scope.ticks.push(d.getFullYear() + '-01-01');

            document.getElementById('log-index').style.transform = 'translate(-'+(document.getElementById('log-index').offsetWidth-document.getElementById('nav-log').offsetWidth)+'px,0)';

            function hideTooltip() {
                document.getElementById('log-tooltip').style.top = '-1000px';
            }

            function showTooltip(text, left) {
                var tooltip = document.getElementById('log-tooltip');
                tooltip.innerText = text;
                tooltip.style.top = '20px';
                tooltip.style.left = (left - tooltip.offsetWidth / 2) + 'px';
            }

            $scope.getDates = function() {
                return Storage.getDates();
            }

            $scope.calcLeft = function(date) {
                var left = Math.floor((new Date(date).getTime() - d.getTime()) / 86400000) * 2;
                return left + "px";
            }

            $scope.mouseMove = function($event, date) {
                if ( $event.target.className == 'log-index' ) {
                    hideTooltip();
                    return;
                }

                showTooltip(date.replace(/-/g, '.'), $event.x);

                console.log($event);
                console.log(date);

                return true;
            }

            $scope.hideTooltip = function($event) {
                if ( $event.target.className == 'log-index' )
                    hideTooltip();
            }
        }
    ]);

    app.controller('NavDomainController', [
        '$scope', 'StorageService', 'MapService',
        function($scope, Storage, Map) {
            $scope.showing = null;

            $scope.getDomains = function() {
                return Storage.getDomains();
            }

            $scope.getZones = function(domain_name) {
                return Storage.getZones(domain_name);
            }

            $scope.getSpots = function(spot_name) {
                return Storage.getSpots(spot_name);
            }

            $scope.getBestSpots = function(domain_name) {
                var zones = _.pluck(Storage.getZones(domain_name), 'name');
                var spots = Storage.getSpots();
                var selected = [];

                spots.forEach(function(spot) {
                    if ( spot.stars == 5 && _.indexOf(zones, spot.area) > -1 )
                        selected.push(spot);
                });

                return selected;

                // return _.find(Storage.getSpots(),
                //     function(spot) {
                //         return spot.stars == 5 && _.indexOf(zones, spot.area) > -1;
                //     }
                // );

                // {stars: 5, area: Storage.getZones(domain_name)});
            }

            $scope.isShown = function(domain) {
                return $scope.showing == domain;
            }

            $scope.clickDomain = function(domain) {
                $scope.showing = domain;

                var domain = Storage.getDomain(domain.name);
                domain = domain.length > 0 ? domain[0] : null;
                if ( !domain )
                    return;

                Map.moveTo(domain.center, domain.zoom);
            }

            // $scope.moveTo = function(domain_name) {
            //     var domain = Storage.getDomain(domain_name);
            //     domain = domain.length > 0 ? domain[0] : null;
            //     if ( !domain )
            //         return;

            //     Map.moveTo(domain.center, domain.zoom);
            // }
        }
    ]);

    app.controller('HomeController', [
        '$scope', 'StorageService',
        function($scope, Storage) {
            $scope.getDates = function() {
                return Storage.getDates();
            }

            $scope.getLogs = function(date) {
                return Storage.getLogs(date);
            }

            $scope.getSpot = function(name) {
                return Storage.getSpot(name);
            }
        }
    ]);

    app.controller('ZoneController', [
        '$scope', 'StorageService', '$routeParams',
        function($scope, Storage, $routeParams) {
            var zone_name = $routeParams.zone_name;

            $scope.title = zone_name;
            $scope.zone = Storage.getZone(zone_name)[0];
            $scope.spots = Storage.getSpots(zone_name);

            $scope.getDates = function() {
                return [];
            }

            $scope.getLogs = function(date) {
                return [];
            }
        }
    ]);

    app.controller('SpotController', [
        '$scope', 'StorageService', '$routeParams',
        function($scope, Storage, $routeParams) {
            var spot_name = $routeParams.spot_name;
            var spot_logs = _.where(Storage.getLogs(), {name: spot_name});

            $scope.spot = _.where(Storage.getSpots(), {name: spot_name})[0];
            $scope.title = spot_name;

            $scope.getDates = function() {
                return _.uniq(_.pluck(spot_logs, 'date'));
            }

            $scope.getLogs = function(date) {
                return _.where(spot_logs, {date: date});
            }
        }
    ]);
})();

