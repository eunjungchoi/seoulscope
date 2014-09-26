(function() {
    var app = angular.module('seoulscope', []);

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
        map: {
            center: {lat:37.566535, lng:126.9779692},
            zoom: 12,
        },
        picasa: "101855579290050276785",
    });

    app.config(function($routeProvider) {
        // $routeProvider
        //     .when('/domain', {
        //         templateUrl: 'template/domain.html',
        //         controller: 'DomainController',
        //     })
    }
})();

