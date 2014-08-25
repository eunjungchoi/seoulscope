var config = {
    map: {
        center: {lat:37.566535, lng:126.9779692},
        zoom: 12,
        style: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":20}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":40}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-10},{"lightness":30}]},{"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":10}]},{"featureType":"landscape.natural","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":60}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]}],
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
    var _isVisible = false;

    this.getObj = function() {
        return $obj;
    }
    this.clear = function() {
        $obj.html('');
    }
    this.show = function() {
        $(".page").hide();
        $obj.show();
        $("#pages").scrollTop(0);

        _isVisible = true;
    }
    this.hide = function() {
        $obj.hide();

        _isVisible = false;
    }
    this.isVisible = function() {
        return _isVisible;
    }
}

function PageHome(obj) {
    var $title;
    var $list;
    var dates = {};

    Page.call(this, obj);

    this.clear = function() {
        dates = {};
        this.getObj().html('');

        $title = $("<h1>").appendTo(this.getObj());
        $list = $("<ol>").appendTo(this.getObj());

        $title.text("Seoul Scope");
    }

    function createDateListItem(date) {
        var $item = $("<li>").attr("id", date.getTime()).appendTo($list);
        $("<hr>").appendTo($item);
        var $date_title = $("<h2>").appendTo($item);
        var $span = $("<span>").addClass("date").text(date.toFormatted()).appendTo($date_title);
        $("<i>").addClass("fa fa-calendar").prependTo($span);

        return $item;
    }

    this.addDate = function(date) {
        var $item = createDateListItem(date);

        var $p = $("<p>").appendTo($item);
        var $ul = $("<ul>").appendTo($item);
        dates[date.getTime()] = $item;

        return $item;
    }
}
// inheritPrototype(PageHome, Page);

function PageTag(obj) {
    var $title;
    var $desc;
    var $ol;
    var $ul;

    Page.call(this, obj);

    this.clear = function() {
        this.getObj().html('');

        $title = $("<h1>").appendTo(this.getObj());
        $("<hr>").appendTo(this.getObj());
        $desc = $("<blockquote>").appendTo(this.getObj());
        $ol = $("<ol>").appendTo(this.getObj());
        $ul = $("<ul>").appendTo(this.getObj());
    };

    this.setTitle = function(title) {
        $title.text(title);
    };

    this.setDescription = function(desc) {
        $desc.html(desc);
    };

    this.addPhoto = function(img) {
        var $li = $("<li>").appendTo($ul);
        var $img = $("<img>").attr("src", img).appendTo($li);
    };
}

function PageSpot(obj) {
    var $h1;
    var $ol;

    Page.call(this, obj);

    this.clear = function() {
        this.getObj().html('');

        $h1 = $("<h1>").appendTo(this.getObj());
        $ol = $("<ol>").appendTo(this.getObj());
    };

    this.setTitle = function(title) {
        $h1.text(title);
    };

    this.getTitle = function() {
        return $h1.text();
    };

    this.addLog = function(log) {
        var $li = $("<li>").attr("id", log.date.getTime()+"@"+log.name).appendTo($ol);
        var $h1 = $("<h2>").appendTo($li);
        $("<span>").addClass("date").text(log.date.toFormatted()).appendTo($h1);
        $("<hr>").prependTo($li);
        var $p = $("<p>").html(log.text).appendTo($li);
        var $ul = $("<ul>").appendTo($li);
        log.getPhotos($ul, function($ul, photos) {
            for ( var i = 0 ; i < photos.length ; i++ ) {
                var $li = $("<li>").appendTo($ul);
                var $img = $("<img>").attr("src", photos[i]).appendTo($li);
            }
        })

        return $li;
    };
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
    var _center;

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
        init: function(obj, onTilesLoaded) {
            var deferred = $.Deferred();

            _center = new google.maps.LatLng(config.map.center.lat, config.map.center.lng);
            var mapOptions = {
                center: _center,
                mapTypeControl: false,
                panControl: false,
                zoom: config.map.zoom,
                minZoom: config.map.zoom,
                // styles: config.map.style,
            };

            _map = new google.maps.Map(obj, mapOptions);
            google.maps.event.addListenerOnce(_map, 'tilesloaded',
                function() {
                    deferred.resolve();
                });

            return deferred.promise();
        },
        getMap: function() {
            return _map;
        },
        reset: function() {
            // this.setCenter(new google.maps.LatLng(config.map.center.lat, config.map.center.lng));
            // this.setZoom(config.map.zoom);
            this.moveTo(_center, config.map.zoom);
        },
        moveTo: function(center, zoom) {
            _map.setCenter(center);
            changeZoom(zoom);
        },
        // setCenter: function(latlng) {
        //     _map.setCenter(latlng);
        // },
        // setZoom: function(zoom) {
        //     changeZoom(zoom);
        //     // _map.setZoom(zoom);
        // }
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

var Indicator = (function() {
    var d2014 = new Date(2014, 0, 1).getTime();
    var $div;
    var data = [];

    function getOffset(timestamp) {
        return Math.floor((timestamp - d2014) / 86400000) * 2;
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

    // gvizQuery.send(callback);
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

            // callback();
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

    var name = tag.name;

    if ( $target.siblings().length == 0 ) {
        var $ul = $("<ul>").insertAfter($target);
        var spots = Spots.getSpotsByTag(name);

        for ( var i = 0 ; i < spots.length ; i++ ) {
            var $li = $("<li>").appendTo($ul);
            $li.append($("<a>").addClass("spot").text(spots[i].name).attr("href", "#").data("name", spots[i].name));
        }
        $ul.show();
    }
    else {
        $target.siblings("ul").show();
    }

    pageTag.setTitle(name);
    pageTag.setDescription(tag.description);
    var photos = tag.photos;
    if ( !photos ) {
        var folder = tag.folder;
        $.getJSON("https://picasaweb.google.com/data/feed/api/user/"+config.picasaweb+"/albumid/"+folder+"?callback=?", {
            alt: "json",
        })
        .done(function(data) {
            var photos = [];
            $.each( data.feed.entry, function(i, item) {
                photos.push(item.content.src);
                pageTag.addPhoto(item.content.src);
            });
            tag.photos = photos;
        });
    }
    else {
        for ( var i = 0 ; i < photos.length ; i++ )
            pageTag.addPhoto(photos[i]);
    }
    pageTag.show();
    pushState(null, "!" + name);

    return false;
}

function onClickSpot(e)
{
    var name = this.name ? this.name : $(this).data("name");

    $("#tag-nav a").removeClass("active");
    if ( e && e.target.tagName == "A" )
        $(this).addClass("active");

    pageSpot.clear();
    pageSpot.setTitle(name);

    Indicator.disable();
    var logs = Logs.getLogsByName(name);
    for ( var i = 0 ; i < logs.length ; i++ ) {
        Indicator.enable(logs[i].timestamp);
        pageSpot.addLog(logs[i]);
    }

    pageSpot.show();

    if ( e )
        pushState(null, name);

    return false;
}

function onClickLog()
{
    if ( $(this).hasClass("disabled") )
        return false;

    var timestamp = $(this).attr("href").substring(1);
    var title = pageSpot.isVisible() ? pageSpot.getTitle() : null;

    if ( title )
        logId = timestamp + "@" + title;

    document.getElementById(logId).scrollIntoView(true);

    // history.pushState(null, null, location.href.replace(location.hash,"")+"#"+logId);
    pushState(timestamp, title);

    return false;
}

function resize()
{
    $("#map-canvas").width($(window).width() - $("#log-nav").width());
    $("#pages").width($("#log-nav").width());
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
            var $h2 = $("<h3>").appendTo($li);
            var $span_name = $("<span>").text(logs[j].name).appendTo($h2);
            var $p = $("<p>").appendTo($li);
            var $span = $("<span>").addClass("tag").appendTo($h2);

            var spot = Spots.getSpotByName(logs[j].name);
            if ( spot ) {
                $span_name.html("");
                $span_name.append($("<a>").text(logs[j].name).attr("href", "#").data("name", logs[j].name));
                $span.text(spot.tag);
            }

            $p.html(logs[j].text);

            logs[j].getPhotos($li, function($li, photos) {
                if ( photos.length > 0 ) {
                    var $div = $("<div>").addClass("image-wrapper").appendTo($li);
                    var $image = $("<img>").appendTo($div);
                    $image.attr("src", photos[0]);

                    $image.one("load", parseHash);
                }
            });
        }

        Indicator.create(dates[i]);
    }

    parseHash();
}

function pushState(timestamp, title) {
    var href = location.href.replace(location.hash,"").replace("#", "") + "#";

    if ( timestamp )
        href += timestamp;

    if ( title )
        href += "@" + title;

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
    var title = split.length > 1 && split[1];
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
    resize();

    pageHome = new PageHome(document.getElementById("home-page"));
    pageHome.clear();

    pageTag = new PageTag(document.getElementById("tag-page"));
    pageTag.clear();

    pageSpot = new PageSpot(document.getElementById("spot-page"));
    pageSpot.clear();

    Indicator.init();

    // $("#home-page").on("click", ".image-wrapper", function() {
    //     var $this = $(this);
    //     console.log($this);
    //     if ( $this.height() == "200" )
    //         $this.css("height", "auto");
    //     else
    //         $this.css("height", "200px");
    // });
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

});

$(window).bind('popstate', function(event) {
    // var state = event.originalEvent.state;

    parseHash();
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