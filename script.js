var config = {
    map: {
        center: {lat:37.566535, lng:126.9779692},
        zoom: 12,
    },
    center: {lat:37.566535, lng:126.9779692},
    zoom: 12,
    tagDefault: "SEOUL",
    table: {
        tag: "1mIutuGqnSYRGz7hrWn__Ll-Xq-Ru-5amqoBJHiXU",
        spot: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
        log: "1bW1VuYnupB4thC4iSyhzDxTNwxHTMHm4qHIxxDWc",

        area: "1mIutuGqnSYRGz7hrWn__Ll-Xq-Ru-5amqoBJHiXU",
        place: "1EMWASH1WZg-hwRq4Sds8hBA_TSxs1IGtMe3TcjK7",
    },
    picasaweb: "101855579290050276785",
};

//var map;

var pageHome, pageTag, pageSpot;

// function inheritPrototype(childObject, parentObject) {
//     var copyOfParent = Object.create(parentObject.prototype);
//     copyOfParent.constructor = childObject;
//     childObject.prototype = copyOfParent;
// }

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

function Page(obj) {
    var $obj = $(obj);

    this.getObj = function() {
        return $obj;
    }
    this.clear = function() {
        $obj.html('');
    }
    this.show = function() {
        $(".page").hide();
        $obj.show();
    }
    this.hide = function() {
        $obj.hide();
    }
}

function PageHome(obj) {
    var $ol;
    var dates = {};

    Page.call(this, obj);

    this.clear = function() {
        dates = {};
        $ol = $("<ol>");
        this.getObj().html('');
        $ol.appendTo(this.getObj());
    }

    this.addDate = function(date) {
        var $li = $("<li>").appendTo($ol);
        var year = date.getFullYear();
        var mon = date.getMonth() + 1;
        var day = date.getDate();
        $("<hr>").appendTo($li);
        var $h1 = $("<h1>").text(year + "." + mon + "." + day).appendTo($li);
        var $p = $("<p>").appendTo($li);
        var $ul = $("<ul>").appendTo($li);
        dates[date.getTime()] = $li;

        return $li;
    }
}
// inheritPrototype(PageHome, Page);

function PageTag(obj) {
    var $h1;
    var $p;
    var $ol;
    var $ul;

    Page.call(this, obj);

    this.clear = function() {
        this.getObj().html('');

        $h1 = $("<h1>").appendTo(this.getObj());
        $p = $("<p>").appendTo(this.getObj());
        $ol = $("<ol>").appendTo(this.getObj());
        $ul = $("<ul>").appendTo(this.getObj());
    };

    this.setTitle = function(title) {
        $h1.text(title);
    };

    this.setDescription = function(desc) {
        $p.text(desc);
    };

    this.addPhoto = function(img) {
        var $li = $("<li>").appendTo($ul);
        var $img = $("<img>").attr("src", img).appendTo($li);
    };

    // this.addLog = function(log) {
    //     var $li = $("<li>").appendTo($ol);
    //     var $h1 = $("<h2>").text(log.date.toLocaleDateString()).appendTo($li);
    //     var $p = $("<p>").text(log.text).appendTo($li);
    //     var $ul = $("<ul>").appendTo($li);
    //     log.getPhotos($ul, function($ul, photos) {
    //         for ( var i = 0 ; i < photos.length ; i++ ) {
    //             var $li = $("<li>").appendTo($ul);
    //             var $img = $("<img>").attr("src", photos[i]).appendTo($li);
    //         }
    //     })
    //
    //     return $li;
    // }
}

function PageSpot(obj) {
    var $h1;
    var $ol;

    Page.call(this, obj);

    this.clear = function() {
        this.getObj().html('');

        $h1 = $("<h1>").appendTo(this.getObj());
        $ol = $("<ol>").appendTo(this.getObj());
    }

    this.setTitle = function(title) {
        $h1.text(title);
    }

    this.addLog = function(log) {
        var $li = $("<li>").appendTo($ol);
        var $h1 = $("<h2>").text(log.date.toLocaleDateString()).appendTo($li);
        var $p = $("<p>").text(log.text).appendTo($li);
        var $ul = $("<ul>").appendTo($li);
        log.getPhotos($ul, function($ul, photos) {
            for ( var i = 0 ; i < photos.length ; i++ ) {
                var $li = $("<li>").appendTo($ul);
                var $img = $("<img>").attr("src", photos[i]).appendTo($li);
            }
        })

        return $li;
    }
}

function Log(obj) {
    var id = 0;
    this.name = obj.name;
    this.date = obj.date;
    this.text = obj.text;
    var photos = [];
    var folder = obj.folder;
    this.timestamp = this.date.getTime();

    this.getPhotos = function(i, callback) {
        if ( photos.length == 0 ) {
            $.getJSON("https://picasaweb.google.com/data/feed/api/user/"+config.picasaweb+"/albumid/"+folder+"?callback=?", {
                alt: "json",
            })
            .done(function(data) {
                $.each( data.feed.entry, function(i, item) {
                    photos.push(item.content.src);
                });
                callback(i, photos);
            });
        }
        else {
            callback(i, photos);
        }
    }
}

var Map = (function() {
    var _map;

    function changeZoom(zoom) {
        setTimeout(function() {_map.setZoom(zoom)}, 80);
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
        setMap: function(map) {
            _map = map;
        },
        getMap: function() {
            return _map;
        },
        setCenter: function(latlng) {
            _map.setCenter(latlng);
        },
        setZoom: function(zoom) {
            changeZoom(zoom);
            // _map.setZoom(zoom);
        }
    }
}());

var Spots = (function() {
    var spots = [];

    return {
        add: function(spot) {
            spots.push(spot);
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
                map: Map.getMap(),
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

var Indicators = (function() {
    var d2014 = new Date(2014, 0, 1);
    var $div;
    // var offset = 219;

    return {
        init: function() {
            var today = new Date();
            var offset = Math.floor((today.getTime() - d2014.getTime()) / 86400000);
            $div = $("<div>").data("index", -1).appendTo("#log-nav");
            $div.css("left", (offset * 2) + "px").addClass('today');
        },
        clear: function() {
            $("#log-nav").html("");
            this.init();
        },
        create: function(date) {
            var $div = $("<div>").data("date", date).appendTo("#log-nav");
            var offset = Math.floor((date - d2014.getTime()) / 86400000);
            $div.css("left", (offset * 2) + "px");
        },
    }
}());

google.load('visualization', '1');

function select(table, callback)
{
    var query = "SELECT * FROM " + table;
    query = encodeURIComponent(query);
    var gvizQuery = new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq=' + query);

    gvizQuery.send(callback);

    // return new Promise(function(fulfill, reject) {
    //
    // });
}

function loadTags()
{
    select(config.table.tag, function(response) {
        var table = response.getDataTable();
        var numRows = table.getNumberOfRows();
        var index = {
            name: 1,
            description: 2,
            center: 4,
            zoom: 5,
            folder: 6,
        };

        var $li = $("<li>").appendTo("#tag-nav ul");
        $("<a>").attr("href", "#").addClass("tag default").text(config.tagDefault).appendTo($li);

        for (var i = 0; i < numRows; i++) {
            var name = table.getValue(i, index.name);
            var $li = $("<li>").appendTo("#tag-nav ul");
            var $a = $("<a>").attr("href", "#").addClass("tag").text(name).appendTo($li);
            $a.data("name", name);
            $a.data("description", table.getValue(i, index.description));
            $a.data("center", table.getValue(i, index.center));
            $a.data("zoom", table.getValue(i, index.zoom));
            $a.data("folder", table.getValue(i, index.folder));
        }

        $("#tag-nav").show();
    });
    //
    // return new Promise(function(fulfill, reject) {
    // });
}

function loadSpots(callback)
{
    select(config.table.spot, function(response) {
        var table = response.getDataTable();
        var numRows = table.getNumberOfRows();
        var index = {
            name: 1,
            coordinates: 3,
            area: 4,
        };

        for (var i = 0; i < numRows; i++) {
            var splitCoordinates = table.getValue(i, index.coordinates).split(',');
            Spots.add({
                name: table.getValue(i, index.name),
                coordinate: new google.maps.LatLng(splitCoordinates[0], splitCoordinates[1]),
                tag: table.getValue(i, index.area),
            });
        }

        callback();
    });
}

function loadLogs(callback)
{
    select(config.table.log, function(response) {
        var table = response.getDataTable();
        var numRows = table.getNumberOfRows();
        var index = {
            name: 1,
            date: 2,
            photo: 4,
            text: 5,
        };

        for (var i = 0; i < numRows; i++) {
            Logs.add(new Log({
                name: table.getValue(i, index.name),
                date: table.getValue(i, index.date),
                text: table.getValue(i, index.text),
                folder: table.getValue(i, index.photo),
            }));
        }

        callback();
    });
}

function onClickTag()
{
    $target = $(this);

    Indicators.clear();
    $(".tag-spots").hide();

    if ( $target.hasClass("default") ) {
        Map.setCenter(new google.maps.LatLng(config.center.lat, config.center.lng));
        Map.setZoom(config.zoom);

        var dates = Logs.getDates();
        for ( i = 0 ; i < dates.length ; i++ )
            Indicators.create(dates[i]);

        pageHome.show();

        return false;
    }

    var latlng = $target.data("center").split(',');
    Map.setCenter(new google.maps.LatLng(latlng[0], latlng[1]));
    Map.setZoom(parseInt($target.data("zoom")));

    var tag = $target.data("name");

    if ( $target.children().length == 0 ) {
        var $ul = $("<ul>").addClass("tag-spots").appendTo($target);
        var spots = Spots.getSpotsByTag(tag);

        for ( var i = 0 ; i < spots.length ; i++ ) {
            var $li = $("<li>").appendTo($ul);
            $li.text(spots[i].name);
        }
        $ul.show();

        var photos = $target.data("photos");
        if ( !photos ) {
            var folder = $target.data("folder");
            $.getJSON("https://picasaweb.google.com/data/feed/api/user/"+config.picasaweb+"/albumid/"+folder+"?callback=?", {
                alt: "json",
            })
            .done(function(data) {
                var photos = [];
                $.each( data.feed.entry, function(i, item) {
                    photos.push(item.content.src);
                    pageTag.addPhoto(item.content.src);
                });
                $target.data("photos", photos);
            });
        }
    }
    else {
        $target.children("ul").show();
    }
// console.log($target.data("description"));
    pageTag.setTitle(tag);
    pageTag.setDescription($target.data("description"));
    pageTag.show();

    return false;
}

function onClickSpot()
{
    var logs = Logs.getLogsByName(this.name);

    pageSpot.clear();
    pageSpot.setTitle(this.name);

    Indicators.clear();
    for ( var i = 0 ; i < logs.length ; i++ ) {
        Indicators.create(logs[i].timestamp);
        pageSpot.addLog(logs[i]);
    }

    pageSpot.show();
}

function onClickLog()
{
    loadLog(logs[$(this).data("index")]);
}

function resize()
{
    $("#map-canvas").width($(window).width() - $("#log-nav").width());
    $("#pages").width($("#log-nav").width());
}

function onSpotLoaded()
{
    // 마커.
    var spots = Spots.getSpots();
    for ( i = 0 ; i < spots.length ; i++ ) {
        Markers.create(spots[i]);
    }
}

function onLoaded()
{
    // 홈페이지.
    var dates = Logs.getDates();
    for ( i = 0 ; i < dates.length ; i++ ) {
        var $date_li = pageHome.addDate(new Date(dates[i]));
        var $ul = $date_li.find("ul");
        var logs = Logs.getLogs(dates[i]);

        for ( j = 0 ; j < logs.length ; j++ ) {
            var $li = $("<li>").appendTo($ul);
            var $h2 = $("<h2>").text(logs[j].name).appendTo($li);
            var $p = $("<p>").appendTo($li);
            var $span = $("<span>").appendTo($h2);

            var spot = Spots.getSpotByName(logs[j].name);
            if ( spot ) {
                $span.text(spot.tag);
            }

            $p.text(logs[j].text);

            logs[j].getPhotos($li, function($li, photos) {
                if ( photos.length > 0 ) {
                    var $div = $("<div>").addClass("image-wrapper").appendTo($li);
                    var $image = $("<img>").appendTo($div);
                    $image.attr("src", photos[0]);
                }
            });
        }

        Indicators.create(dates[i]);
    }

    pageHome.show();
}

function initialize()
{
    resize();

    pageHome = new PageHome(document.getElementById("home-page"));
    pageHome.clear();

    pageTag = new PageTag(document.getElementById("tag-page"));
    pageTag.clear();

    pageSpot = new PageSpot(document.getElementById("spot-page"));
    pageSpot.clear();

    Indicators.init();

    $(document).on("click", "a.tag", onClickTag);
    $(document).on("click", "#log-nav a", onClickLog);
    $(document).on("click", "#log-nav div", onClickLog);

    // 맵 생성 옵션
    var mapOptions = {
        center: new google.maps.LatLng(config.map.center.lat, config.map.center.lng),
        mapTypeControl: false,
        zoom: config.map.zoom,
        minZoom: config.map.zoom,
    };

    // Map 인스턴스 생성
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    Map.setMap(map);
    google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
        loadTags();
        loadSpots(onSpotLoaded);
        loadLogs(onLoaded);
    });
}

google.maps.event.addDomListener(window, 'load', initialize);
