// (function() {
//     var app = angular.module('seoulscope', []);

//     app.constant('config', {
//         api_key: "AIzaSyCUphKCCMUpng-f3DZEiCGhT8j06GliYRo",
//         tables: {
//             domain: {
//                 id:  "1wyHT6nLOpM57AbT0dyS86Bz6f-bxP6mpv2Qw4vlm",
//                 fields: "name, description, center, zoom, 'order'",
//             },
//             zone: {
//                 id: "1mIutuGqnSYRGz7hrWn__Ll-Xq-Ru-5amqoBJHiXU",
//                 fields: "Name, Description, Center, Zoom, Photo, Shape",
//             },
//             spot: {
//                 id: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
//                 fields: "Name, Address, Coordinates, Area",
//             },
//             log: {
//                 id: "1bW1VuYnupB4thC4iSyhzDxTNwxHTMHm4qHIxxDWc",
//                 fields: "Date, Name, Text, Photo, photos",
//             }
//         },
//         map: {
//             center: {lat:37.566535, lng:126.9779692},
//             zoom: 12,
//         },
//         picasa: "101855579290050276785",
//     });

//     app.config(function($routeProvider) {
//         // $routeProvider
//         //     .when('/domain', {
//         //         templateUrl: 'template/domain.html',
//         //         controller: 'DomainController',
//         //     })
//     }
// })();


var SS = {};
var config = {
    map: {
        center: {lat:37.566535, lng:126.9779692},
        zoom: 12,
    },
    tagDefault: "SEOUL",
    table: {
        tag: "1mIutuGqnSYRGz7hrWn__Ll-Xq-Ru-5amqoBJHiXU",
        spot: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
        log: "1bW1VuYnupB4thC4iSyhzDxTNwxHTMHm4qHIxxDWc",
    },
    picasaweb: "101855579290050276785",
    debug: false,
};

Date.prototype.toFormatted = function() {
    return this.getFullYear() + "." + (this.getMonth() + 1) + "." + this.getDate();
}

var pageHome, pageTag, pageSpot;

var Index = function(key) {
    var itemkey = key;
    var index = [];
    var items = {};

    return {
        add: function(item) {
            if ( -1 === index.indexOf(item[itemkey]) ) {
                index.push(item[itemkey]);
                index.sort(function(a, b) {return b-a;});

                items[item[itemkey]] = [];
            }
            items[item[itemkey]].push(item);
        },
        getIndices: function() {
            return index;
        },
        getItems: function(key) {
            return items[key];
        },
    }
}

var PageManager = (function() {
    var _pages = {};

    return {
        add: function(page) {
            _pages[page.id] = page;
        },
    };
}());

SS.Storage = (function() {
    var s = sessionStorage;
    var d = {};

    return {
        getItem: function(key) {
            return JSON.parse(s.getItem(key));
        },
        setItem: function(key, value) {
            s.setItem(key, JSON.stringify(value));
        },
        getPhotos: function(folder) {
            var photos = this.getItem(folder);
            if ( photos instanceof Array ) {
                var local_d = $.Deferred();
                local_d.resolve(photos);
                return local_d.promise();
            }

            if ( d[folder] )
                return d[folder].promise();

            var deferred = d[folder] = $.Deferred();
            var self = this;

            $.getJSON("https://picasaweb.google.com/data/feed/api/user/"+config.picasaweb+"/albumid/"+folder+"?callback=?", {
                alt: "json",
            })
            .done(function(data) {
                var photos = [];
                $.each( data.feed.entry, function(i, item) {
                    photos.push(item.content.src);
                });

                self.setItem(folder, photos);

                deferred.resolve(photos);
            });

            return deferred.promise();
        },
    }
}());

function Page(el) {
    var _$el = $(el);
    var _template = Handlebars.compile(_$el.html());


    Object.defineProperty(this, "$el", {
        get: function() { return _$el; },
    });
    Object.defineProperty(this, "isVisible", {
        get: function() { return _$el.is(":visible"); },
    });

    this.clear = function() {
        _$el.html('');
    }

    this.show = function() {
        $(".page").hide();
        _$el.show();
        $("#pages").scrollTop(0);
    }

    this.hide = function() {
        _$el.hide();
    }

    this.render = function(data) {
        _$el.html(_template(data));
    }

    this.clear();
}

function PageHome(el) {
    Page.call(this, el);
}

function PageTag(el) {
    Page.call(this, el);

    this.addPhoto = function(img) {
        var $ul = this.$el.find("ul.images");
        var $li = $("<li>").appendTo($ul);
        var $img = $("<img>").attr("src", img).appendTo($li);
    };
}

function PageSpot(el) {
    Page.call(this, el);

    this.getTitle = function() {
        return this.$el.find("h1").text();
    };
}

log_id = 0;
function Log(obj) {
    function getClientId() {
        return ++log_id;
    }

    this.id = getClientId();
    this.name = obj.name;
    this.date = obj.date;
    this.text = obj.text;

    this.folder = obj.folder;
    this.spot = Spots.getSpotByName(this.name);

    var _photos = [];
    this.timestamp = this.date.getTime();

    this.getPhotos = function(i, callback) {
        if ( _photos.length == 0 && this.folder ) {
            SS.Storage.getPhotos(this.folder)
            .done(function(photos) {
                _photos = photos;
                callback(i, _photos);
            });
        }
        else {
            callback(i, _photos);
        }
    }
}

var Map = (function() {
    var _map;
    var _center;
    var _layers = [google.maps.MapTypeId.ROADMAP, "toner", "toner-lite", "watercolor"];

    function changeZoom(zoom) {
        setTimeout(function() { _map.setZoom(zoom) }, 80);
        return;

        var delta = zoom - _map.getZoom();
        if ( delta == 0 )
            return;
        delta = delta / Math.abs(delta);

        google.maps.event.addListenerOnce(_map, 'zoom_changed', function(event) {
            setTimeout(function() {changeZoom(zoom)}, 80);
        });
        _map.setZoom(_map.getZoom()+delta);
        // setTimeout(function() {_map.setZoom(_map.getZoom()+delta)}, 80);
    }

    return {
        get map() { return _map; },

        init: function(obj) {
            var deferred = $.Deferred();

            _center = new google.maps.LatLng(config.map.center.lat, config.map.center.lng);
            var mapOptions = {
                center: _center,
                zoom: config.map.zoom,
                minZoom: config.map.zoom,

                panControl: false,
                // mapTypeControl: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControlOptions: {
                    mapTypeIds: _layers,
                },
            };

            _map = new google.maps.Map(obj, mapOptions);
            for ( var i = 0 ; i < _layers.length; i++ ) {
                if ( _layers[i] == google.maps.MapTypeId.ROADMAP )
                    continue;

                _map.mapTypes.set(_layers[i], new google.maps.StamenMapType(_layers[i]));
            }

            google.maps.event.addListenerOnce(_map, 'tilesloaded',
                function() {
                    deferred.resolve();
                });

            return deferred.promise();
        },
        reset: function() {
            this.moveTo(_center, config.map.zoom);
        },
        moveTo: function(center, zoom) {
            _map.setCenter(center);
            changeZoom(zoom);
        },
    }
}());

var Spots = (function() {
    var spots = [];

    return {
        add: function(spot) {
            spots.push(spot);
            return spot;
        },
        getSpots: function() {
            return spots;
        },
        getSpotByName: function(name) {
            for ( var i = 0 ; i < spots.length ; i++ ) {
                if ( spots[i].name == name )
                    return spots[i];
            }
        },
        getSpotsByTag: function(tag) {
            var r = [];

            for ( var i = 0 ; i < spots.length ; i++ ) {
                if ( spots[i].tag == tag )
                    r.push(spots[i]);
            }
            return r;
        }
    }
}());

var Logs = (function() {
    var logs = [];
    var idx_date = new Index('timestamp');

    return {
        add: function(log) {
            logs.push(log);
            idx_date.add(log);
        },
        getDates: function() {
            return idx_date.getIndices();
        },
        getLogs: function(timestamp) {
            if ( null === timestamp )
                return logs;
            else
                return idx_date.getItems(timestamp);
        },
        getLogsByName: function(name) {
            var l = [];

            for ( var i = 0 ; i < logs.length ; i++ ) {
                if ( logs[i].name == name )
                    l.push(logs[i]);
            }

            l.sort(function(a, b) {return a.timestamp < b.timestamp});
            return l;
        },
        find: function(id) {
            for ( var i = 0 ; i < logs.length ; i++ )
                if ( logs[i].id == id )
                    return logs[i];
        }
    }
}());

var Markers = (function() {
    var markers = [];

    return {
        clear: function() {
            for (var i = 0; i < markers.length; i++)
                markers[i].setMap(null);
            markers = [];
        },
        create: function(spot) {
            var marker = new google.maps.Marker({
                map: Map.map,
                position: spot.coordinate,
                icon: {
                    // Star
                    path: 'M 0,-24 6,-7 24,-7 10,4 15,21 0,11 -15,21 -10,4 -24,-7 -6,-7 z',
                    fillColor: '#ED323B',
                    fillOpacity: 1,
                    scale: 1/3,
                    strokeColor: '#bd8d2c',
                    strokeWeight: 1
                }
            });
            marker.name = spot.name;

            markers.push(marker);

            google.maps.event.addListener(marker, 'click', onClickSpot);
        },
    }
}());

var Indicator = (function() {
    var d2014 = new Date(2014, 0, 1).getTime();
    var $div;
    var data = [];

    function getOffset(timestamp) {
        return Math.floor((timestamp - d2014) / 86400000) * 2;
    }

    function createAnchor() {
        return $("<a>");
    }

    return {
        init: function() {
            $div = $("<div>").data("index", -1).appendTo("#log-nav");
            $div.css("left", getOffset(new Date().getTime()) + "px").addClass('today');
        },
        enable: function(timestamp) {
            if ( timestamp ) {
                $("#l"+timestamp).removeClass("disabled");
                $("#lm"+timestamp).removeClass("disabled");
            }
            else {
                $(".log-nav a").removeClass("disabled");
            }
        },
        disable: function() {
            $(".log-nav a").addClass("disabled");
        },
        clear: function() {
            this.disable();
        },
        create: function(date) {
            if ( data.indexOf(date) < 0 ) {
                var $a = $("<a>").data("date", date).appendTo("#log-nav");
                $a.attr("id", "l"+date);
                $a.attr("href", "#" + date);
                $a.css("left", getOffset(date) + "px");
                $a.data("date", new Date(date));

                $a = $("<a>").data("date", date).appendTo("#log-nav-mag");
                $a.attr("id", "lm"+date);
                $a.attr("href", "#" + date);
                $a.css("left", getOffset(date) * 5 + "px");
                $a.data("date", new Date(date));

                data.push(date);
            }
            this.enable(date);
        },
    }
}());

google.load('visualization', '1');

function select(table, callback)
{
    var query = "SELECT * FROM " + table;
    query = encodeURIComponent(query);
    var gvizQuery = new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq=' + query);

    var deferred = $.Deferred();
    gvizQuery.send(function(response) {
        var table = response.getDataTable();
        var columnIndex = {};

        for ( var i = 0 ; i < table.getNumberOfColumns() ; i++ ) {
            columnIndex[table.getColumnLabel(i)] = i;
        }

        table.getValueByLabel = function(rowIndex, columnLabel) {
            return this.getValue(rowIndex, columnIndex[columnLabel]);
        }

        deferred.resolve(table);
    });

    return deferred.promise();
}

function loadTags()
{
    var deferred = $.Deferred();

    select(config.table.tag)
        .done(function(table) {
            var numRows = table.getNumberOfRows();

            var $li = $("<li>").appendTo("#tag-nav ul");
            $("<a>").attr("href", "#").addClass("tag default active").text(config.tagDefault).appendTo($li);

            for (var i = 0; i < numRows; i++) {
                var name = table.getValueByLabel(i, "Name");
                var $li = $("<li>").appendTo("#tag-nav ul");
                var $a = $("<a>").attr("href", "#").addClass("tag").text(name).appendTo($li);
                var latlng = table.getValueByLabel(i, "Center").split(',');

                $a.data("tag", {
                    "name": name,
                    "description": table.getValueByLabel(i, "Description"),
                    "center": table.getValueByLabel(i, "Center"),
                    "zoom": parseInt(table.getValueByLabel(i, "Zoom")),
                    "folder": table.getValueByLabel(i, "Photo"),
                    "latlng": new google.maps.LatLng(latlng[0], latlng[1]),
                });
            }

            $("#tag-nav").show();

            deferred.resolve();
        });

    return deferred.promise();
}

function loadSpots()
{
    var deferred = $.Deferred();

    select(config.table.spot)
        .done(function(table) {
            var numRows = table.getNumberOfRows();

            for (var i = 0; i < numRows; i++) {
                var splitCoordinates = table.getValueByLabel(i, "Coordinates").split(',');
                var spot = Spots.add({
                    name: table.getValueByLabel(i, "Name"),
                    coordinate: new google.maps.LatLng(splitCoordinates[0], splitCoordinates[1]),
                    tag: table.getValueByLabel(i, "Area"),
                });

                Markers.create(spot);
            }

            deferred.resolve();
        });

    return deferred.promise();
}

function loadLogs(callback)
{
    var deferred = $.Deferred();

    select(config.table.log)
        .done(function(table) {
            var numRows = table.getNumberOfRows();

            for (var i = 0; i < numRows; i++) {
                Logs.add(new Log({
                    name: table.getValueByLabel(i, "Name"),
                    date: table.getValueByLabel(i, "Date"),
                    text: table.getValueByLabel(i, "Text").replace(/\\\\/g, "<br>"),
                    folder: table.getValueByLabel(i, "Photo"),
                }));
            }

            deferred.resolve();
        });

    return deferred.promise();
}

function onClickTag()
{
    $target = $(this);

    $("#tag-nav a").removeClass("active");
    $target.addClass("active");

    Indicator.disable();
    $("#tag-nav ul ul").hide();

    if ( $target.hasClass("default") ) {
        Map.reset();
        Indicator.enable();
        pageHome.show();
        pushState();

        return false;
    }

    pageTag.clear();

    var tag = $target.data("tag");

    Map.moveTo(tag.latlng, tag.zoom);

    $target.siblings("ul").show();

    pageTag.render({
        title: tag.name,
        description: tag.description,
    });

    var photos = tag.photos;
    if ( !photos ) {
        var folder = tag.folder;

        SS.Storage.getPhotos(folder)
        .done(function(photos) {
            for ( var i = 0, len = photos.length ; i < len ; i++ ) {
                pageTag.addPhoto(photos[i]);
            }
            tag.photos = photos;
        });
    }
    else {
        for ( var i = 0 ; i < photos.length ; i++ )
            pageTag.addPhoto(photos[i]);
    }
    pageTag.show();
    pushState(null, "!" + tag.name);

    return false;
}

function onClickSpot(e)
{
    var name = this.name ? this.name : $(this).data("name");

    $("#tag-nav a").removeClass("active");
    if ( e && e.target.tagName == "A" )
        $(this).addClass("active");

    Indicator.disable();
    var logs = Logs.getLogsByName(name);
    var dates = [];
    for ( var i = 0 ; i < logs.length ; i++ ) {
        Indicator.enable(logs[i].timestamp);
        dates.push({
            id: logs[i].date.getTime()+"@"+logs[i].name,
            log: logs[i],
        });
    }

    pageSpot.render({
        title: name,
        dates: dates,
    });
    pageSpot.show();

    pageSpot.$el.find("ul.images").each(function() {
        var $this = $(this);
        var log = Logs.find($this.data("log-id"));

        if ( !log )
            return;

        log.getPhotos($this, function($ul, photos) {
            for ( var i = 0 ; i < photos.length ; i++ ) {
                var $li = $("<li>").appendTo($ul);
                var $img = $("<img>").attr("src", photos[i]).appendTo($li);
            }
        });
    });

    if ( e )
        pushState(null, name);

    return false;
}

function onClickLog()
{
    if ( $(this).hasClass("disabled") )
        return false;

    var timestamp = $(this).attr("href").substring(1);
    var title = pageSpot.isVisible ? pageSpot.getTitle() : null;

    logId = timestamp;
    if ( title )
        logId = timestamp + "@" + title;

    document.getElementById(logId).scrollIntoView(true);

    pushState(timestamp, title);

    return false;
}

function resize()
{
    $("#map-canvas").width($(window).width() - $("#log-nav").width());
}

function onLoaded()
{
    // 태그별 스팟.
    $("#tag-list a").each(function(index, value) {
        var $target = $(value);

        if ( $target.hasClass("default") )
            return;

        var tag = $target.data("tag");

        var $ul = $("<ul>").insertAfter($target);
        var spots = Spots.getSpotsByTag(tag.name);
        for ( var i = 0 ; i < spots.length ; i++ ) {
            var $li = $("<li>").appendTo($ul);
            $li.append($("<a>").addClass("spot").text(spots[i].name).attr("href", "#").data("name", spots[i].name));
        }
        $ul.hide();
    });

    // 홈페이지 render.
    var dates = Logs.getDates();
    for ( i = 0 ; i < dates.length ; i++ ) {
        Indicator.create(dates[i]);

        dates[i] = {
            id: dates[i],
            date: dates[i],
            logs: Logs.getLogs(dates[i]),
        }
    }

    pageHome.render({dates: dates});
    pageHome.show();

    $("#home-page ul li").each(function() {
        var $this = $(this);
        var log = Logs.find($this.data("log-id"));

        if ( !log )
            return;

        log.getPhotos($this, function($li, photos) {
            if ( photos.length > 0 ) {
                var $div = $("<div>").addClass("image-wrapper").appendTo($li);
                var $image = $("<img>").appendTo($div);
                $image.attr("src", photos[0]);
                if ( pageHome.isVisible )
                    $image.one("load", parseHash);
            }
        });
    });

    parseHash();
}

function pushState(timestamp, title) {
    var href = location.href.replace(location.hash,"").replace("#", "") + "#";

    if ( timestamp )
        href += timestamp;

    if ( title )
        href += "@" + encodeURI(title);

    history.pushState(null, null, href);
}

function parseHash() {
    var hash = window.location.hash;

    if ( hash == "" ) {
        pageHome.show();
        return;
    }

    var split = hash.substring(1).split('@');
    var timestamp = split[0];
    var title = split.length > 1 && decodeURI(split[1]);
    var el;

    if ( split.length == 1 ) {
        pageHome.show();
        el = document.getElementById(timestamp);
        if ( el )
            el.scrollIntoView(true);
        return;
    }

    if ( title.substring(0, 1) == "!" ) {
        var $li = $("#tag-list a:contains('"+title.substring(1)+"')");
        if ( $li.length > 0 )
            $li[0].click();
    }
    else {
        onClickSpot.call({name: title});
        el = document.getElementById(timestamp+"@"+title);
        if ( el )
            el.scrollIntoView(true);
    }
}

$(function() {
    Handlebars.registerHelper('formatDate', function(timestamp) {
        return new Date(timestamp).toFormatted();
    });

    // Handlebars.registerHelper('data', function(context, options) {
    //     return "";
    // });

    resize();

    pageHome = new PageHome(document.getElementById("home-page"));
    pageTag = new PageTag(document.getElementById("tag-page"));
    pageSpot = new PageSpot(document.getElementById("spot-page"));

    Indicator.init();

    $(document).on("click", "a.tag", onClickTag);
    $(document).on("click", ".log-nav a", onClickLog);
    $(document).on("mouseenter", ".log-nav a", function() {
        var tooltip = $("#log-tooltip");

        tooltip.text($(this).data("date").toFormatted());
        tooltip.offset({top:28, left:$(this).offset().left-tooltip.width()/2});

        return false;
    });
    $(document).on("mouseleave", ".log-nav a", function() {
        $("#log-tooltip").offset({top: -1000, left: 0});
    });

    $("#log-nav").bind("mouseenter", function() {
        $("#log-nav-mag-frame").show(); $("#log-nav .today").height(12);
    });
    $("#log-nav-mag-frame").bind("mouseleave", function() {
        $("#log-nav-mag-frame").hide();
        $("#log-nav .today").height(16);
    });

    $(document).on("mousemove", "#log-nav", function(e) {
        var l = e.pageX - 140 / 2;
        if ( l < $("#log-nav").offset().left )
            return true;

        mag_wrapper = $("#log-nav-mag-frame");
        mag_wrapper.offset({top:0, left:l})

        mag = $("#log-nav-mag");
        var left = (e.pageX - $("#log-nav").offset().left) * 5 - 70;
        mag.css("left", -left + "px");

        return false;
    });

    $(document).on("mouseenter", "#tag-nav", function() {
        $(this).css("opacity", "0.5");
    });
    $(document).on("mouseleave", "#tag-nav", function() {
        $(this).css("opacity", "0.1");
    });

    $("#home-page").on("click", "a", onClickSpot);
    $(document).on("click", "a.spot", onClickSpot);

    Map.init(document.getElementById("map-canvas"))
    .done(function() {
        $.when(loadTags(), loadSpots())
        .done(function() {
            loadLogs()
            .done(onLoaded);
        });
    });

    $(window).bind('popstate', function(event) {
        parseHash();
    });
});

var waitForFinalEvent = (function () {
  var timers = {};
  return function (callback, ms, uniqueId) {
    if (!uniqueId) {
      uniqueId = "Don't call this twice without a uniqueId";
    }
    if (timers[uniqueId]) {
      clearTimeout (timers[uniqueId]);
    }
    timers[uniqueId] = setTimeout(callback, ms);
  };
})();

$(window).resize(function() {
    waitForFinalEvent(function() {
        resize();
    }, 500, "window.resize");
})
