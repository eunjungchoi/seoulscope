$(function() {
	var fbRef = new Firebase("https://blazing-torch-4074.firebaseio.com");
	var authRef = new Firebase("https://blazing-torch-4074.firebaseio.com/.info/authenticated");

	var authClient = new FirebaseSimpleLogin(fbRef, function(error, user) {
		if (error) {
			// an error occurred while attempting login
			console.log(error);
		} else if (user) {
			d3.select("#login").style("display", "none");
			d3.select("#view").style("display", "block");

// myRef.child('users').child(user.uid).set({
//         displayName: user.displayName,
//         provider: user.provider,
//         provider_id: user.id
//       });
			S.connect(user);

			console.log("User ID: " + user.uid + ", Provider: " + user.provider);
		} else {
			// user is logged out
		}
	});

	// authRef.on("value", function(snap) {
	// 	if (snap.val() === true) {
	// 		alert("authenticated");
	// 	} else {
	// 		alert("not authenticated");
	// 	}
	// });

	var S = (function() {
		var data = [];
		var fbRefFeeling;

		return {
			connect: function(user) {
				fbRefFeeling = new Firebase("https://blazing-torch-4074.firebaseio.com/feeling/"+user.uid);

				fbRefFeeling.on("value", function(snapshot) {
					data = d3.values(snapshot.val());
					data.forEach(function(elem, index) {
						elem.date = new Date(elem.date);
						// elem.date = d3.time.format.iso.parse(row.date)
					});
					GraphPage.update();
				});
			},
			write: function(val) {
				var date = new Date();

				// 5분 단위로 기록???
				// var coeff = 1000 * 60 * 5;
				// var rounded = new Date(Math.round(date.getTime() / coeff) * coeff);

				// 초, 밀리초 삭제
				date = d3.time.minute.floor(date);

				// 마지막 데이터를 덮어 쓸 것인지?
				if ( data.length && data[data.length-1].date.toJSON() == date.toJSON() ) {
					data[data.length-1].val = val;

					GraphPage.render();
				}
				else {
					fbRefFeeling.push({
						date: date.toJSON(),
						val: val,
					});

					GraphPage.update();
				}

				localStorage.setItem("MODATA", JSON.stringify(data));
			},
			read: function() {
				return data;
			},
			clear: function() {
				localStorage.removeItem("MODATA");
				data = [];
			},
		};

	})();

	var isLandscape, isMobileView;

	function winWidth() {
		return Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
	}
	function winHeight() {
		return Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
	}
	function checkWindowSize() {
		isLandscape = winWidth() > winHeight();
		isMobileView = winWidth() < 768;
	};
	checkWindowSize();

/**
 * Input page
 */
 	var InputRange = (function () {
		var windowHeight = winHeight();
		var height = parseInt(windowHeight * 9 / 100);

		var data = [
			{v:5, h: height},
			{v:4, h: height},
			{v:3, h: height},
			{v:2, h: height},
			{v:1, h: height},
			{v:0, h: windowHeight - height * 10},
			{v:-1, h: height},
			{v:-2, h: height},
			{v:-3, h: height},
			{v:-4, h: height},
			{v:-5, h: height},
		];

		var tc = d3.scale.linear().domain([0,5]).interpolate(d3.interpolateRgb).range(["#0000ff", "#ffffff"]);
		var bc = d3.scale.linear().domain([5,10]).interpolate(d3.interpolateRgb).range(["#ffffff", "#ff0000"]);

		d3.select("#mo-input").selectAll("div")
			.data(data)
				.enter()
				.append("div")
				.style({
					"height": function(d) { return d.h + "px"; },
					"background-color": function(d, i) { return d3.rgb(( i < 5 ) ? tc(i) : bc(i)).darker(0.5); },
				})
				.attr("class", "data")
				.attr("data-color", function(d, i) { return ( i < 5 ) ? tc(i) : bc(i); })
				.attr("data-color-darker", function(d, i) { return d3.rgb(( i < 5 ) ? tc(i) : bc(i)).darker(0.5); })
				.on("mouseover", function(d, i) {
					var f = d3.mouse;
					var pos = f(d3.select("#mo-input").node());
					var el = d3.select("#mo-input").selectAll("div.data")[0][i];

					d3.select("#mo-input div.output")
						.style("top", (el.offsetTop + el.offsetHeight/2) + "px")
						.style("opacity", 1)
						.text(d3.select(el).data()[0].v);

					d3.selectAll("#mo-input div.data")
						.style("background-color", function() { return d3.select(this).attr(this == el ? "data-color" : "data-color-darker"); } )

					d3.select(el)
						.style("background-color", d3.select(el).attr("data-color"));
				})
				.on("mouseout", function(d, i) {
					d3.select("#mo-input div.output")
						.style("opacity", 0)
				})
				.on("click", function(d, i) {
					d3.select(this)
						.transition()
							.delay(0)
							.duration(1000)
							.style("background-color", d3.select(this).attr("data-color-darker"));

					S.write(d3.select(this).data()[0].v);
				})

		var thumb = d3.select("#mo-input").append("div")
			.attr("class", "thumb-virtual")
			.on("touchstart", function() {
				d3.event.preventDefault();
				var f = d3.mouse;
				var pos = f(d3.select("#mo-input").node());
				var el = findEl(pos[1]);

				d3.select(this)
					.style("top", (el.offsetTop + el.offsetHeight/2) + "px")

				if ( pos[0] < $(window).width() / 2 )
					d3.select("#mo-input div.output")
						.style("right", "20px")
						.style("left", "auto")
				else
					d3.select("#mo-input div.output")
						.style("left", "20px")
						.style("right", "auto")


				d3.select("#mo-input div.output")
					.style("top", (el.offsetTop + el.offsetHeight/2) + "px")
					.style("display", "block")
					.style("opacity", 0)
					.transition()
						.duration(100)
						.style("opacity", 1)

				d3.select(el)
					.style("background-color", d3.select(el).attr("data-color"));
			})
			.on("touchmove", function() {
				d3.event.preventDefault();
				var f = d3.mouse;
				var pos = f(d3.select("#mo-input").node());
				var el = findEl(pos[1]);

				d3.select(this)
					.style("top", (pos[1]) + "px")

				d3.select("#mo-input div.output")
					.style("top", (el.offsetTop + el.offsetHeight/2) + "px")
					.text(d3.select(el).data()[0].v);

				d3.selectAll("#mo-input div.data")
					.style("background-color", function() { return d3.select(this).attr(this == el ? "data-color" : "data-color-darker"); } )

				d3.select(el)
					.style("background-color", d3.select(el).attr("data-color"));
			})
			.on("touchend", function() {
				d3.event.preventDefault();
				var f = d3.mouse;
				var pos = f(d3.select("#mo-input").node());
				var el = findEl(pos[1]);

				d3.select(this)
					.transition()
						.duration(100)
						.ease(d3.ease("elastic"))
					.style("top", (el.offsetTop + el.offsetHeight/2) + "px")

				d3.select("#mo-input div.output")
					.style("top", (el.offsetTop + el.offsetHeight/2) + "px")
					.transition()
						.duration(1000)
						.style("opacity", 0)
					.transition()
						.duration(0)
						.style("display", "none")

				d3.select(el)
					.transition()
						.delay(0)
						.duration(1000)
						.style("background-color", d3.select(el).attr("data-color-darker"));

				S.write(d3.select(el).data()[0].v);
			})
			.append("div")
				.attr("class", "thumb")

		var output = d3.select("#mo-input").append("div")
			.attr("class", "output")
			.text("0")
			.on("mouseenter", function(d, i) {
				d3.select(this)
					.style("opacity", 1)
			})


		function findEl(y) {
			var arr = d3.selectAll("#mo-input div.data")[0];
			var found = false;

			for ( var i = 0 ; i < arr.length ; i++ )
				if ( arr[i].offsetTop < y && y <= arr[i].offsetTop + arr[i].offsetHeight ) {
					found = true;
					break;
				}

			if ( !found ) {
				if ( y < 0 )
					i = 0;
				else
					i = arr.length - 1;
			}

			return arr[i];
		}

		return {
			redraw: function() {
				var windowHeight = winHeight();
				var height = parseInt(windowHeight * 9 / 100);

				var data = [
					{v:5, h: height},
					{v:4, h: height},
					{v:3, h: height},
					{v:2, h: height},
					{v:1, h: height},
					{v:0, h: windowHeight - height * 10},
					{v:-1, h: height},
					{v:-2, h: height},
					{v:-3, h: height},
					{v:-4, h: height},
					{v:-5, h: height},
				];

				d3.select("#mo-input").selectAll("div.data")
					.data(data)
					.style({
						"height": function(d) { return d.h + "px"; },
						// "box-shadow": "0px 0px 5px 0px rgba(50, 50, 50, 0.75)",
					})
			}
		}
	})();

/**
 * Graph page
 */
 	var GraphPage = (function() {
		var SCALE = {first: 0, quarterday: 1, halfday: 2, day: 3, towdays: 4, week: 5, towweeks: 6, month: 7, towmonths: 8, halfyear: 9, year: 10, last: 11}
		var ZOOM_LEVEL = [
			{name: "year", },
			{},
			{},
			{},
			{},
			{},
			{},
		];

		var settings = getSettings();
		var chart = {
			container: null,
			axis: null,
			today: null,
			line: null,
			dot: null,

			scale: null,
			zoomer: null,

			func: {
				translate: null,
				t: null,
				v: null,
				l: null,
				line: null,
			}
		};

		function getSettings() {
			var settings = {
				width: isMobileView ? winWidth() : document.getElementById("mo-graph").offsetWidth,
				height: winHeight(),
				container: {
					width: 0,
					height: 0,
				},
				margin: {
					top: 20,
					right: 0,
					bottom: 20,
					left: 0,
				},
			};

			settings.container = {
				height: (settings.height - settings.margin.top - settings.margin.bottom)
			};

			return settings;
		};

		function createChart() {
			var prev = d3.select("#mo-graph svg");
			if ( prev[0][0] !== null ) {
				prev.remove();
				return;
			}

			chart.scale = chart.scale || SCALE.quarterday;
			var now = new Date();
			var today = d3.time.day.floor(now);
			var first, last;

			first = d3.time.day.offset(now, -5);
			last = d3.time.day.offset(now, 5);

			chart.container = d3.select("#mo-graph").append("svg:svg")
				.attr("width", settings.width)
				.attr("height", settings.height)
				.attr("class", "chart")
					.append("svg:g")
					.attr("class", "container")
					.attr("transform", "translate(" + settings.margin.left + "," + settings.margin.top + ")")

			chart.axis = chart.container.append("svg:g")
				.attr("class", "axis")
				.attr("transform", isLandscape? "translate(0," + settings.container.height/2 + ")" : "translate(0," + settings.container.height/2 + ")")

			chart.today = chart.container.append("svg:g")
				.attr("class", "today")
			chart.today.append("rect")
				.attr("width", 10)
				.attr("height", settings.container.height)
				.attr("transform", "translate(-5, 0)" )
				.attr("fill-opacity", "0.5")
				.style("fill", d3.rgb(253, 141, 60))
				.style("stroke-width", "1px")
				.style("stroke", d3.rgb(253, 141, 60))

			chart.line = chart.container.append("svg:g")
				.attr("class", "line-container")

			chart.dot = chart.container.append("svg:g")
				.attr("class", "dot-container")

			chart.func.t = d3.time.scale()
				.domain([first, last])
				.range(isLandscape ? [0, settings.width] : [0, settings.width])

			chart.func.v = d3.scale.linear()
				.domain([-5, 5])
				.range(isLandscape ? [settings.container.height, 0] : [settings.height, 0])

			chart.func.l = d3.scale.linear()
				.domain([-5, 5])
				.range(isLandscape ? [-settings.container.height/2, settings.container.height/2] : [-settings.height/2, settings.height/2])

			chart.func.axis = d3.svg.axis()
				.scale(chart.func.t)
				.tickSize(6, 6)
				.tickPadding(6)
				.orient(isLandscape ? "bottom" : "right");

			if ( isLandscape )
				chart.func.translate = function(d, i) {
					return "translate("+chart.func.t(d.date)+",0)";
				}
			else
				chart.func.translate = function(d, i) {
					return "translate("+chart.func.t(d.date)+",0)";
				}

			// if ( isLandscape )
				chart.func.line = d3.svg.line()
					.x(function(d) { return chart.func.t(d.date); })
					.y(function(d) { return chart.func.v(d.val); })
					// .interpolate("monotone")
					.interpolate("step-after")

// 				// d: (line.interpolate("basis"))(moData),
// 				// d: (line.interpolate("cardinal"))(moData),
// 				// d: (line.interpolate("step-before"))(moData),
// 				// d: (line.interpolate("monotone"))(moData),


			chart.zoomer = d3.behavior.zoom()
				.x(chart.func.t)
				.scaleExtent( [ 10 / 365, 40 ] )
				.on("zoom", function() {
					self.render();
				})

			d3.select("svg").call(chart.zoomer);

			self.render();
		}

 		var self = {
 			invalidate: function() {
 				settins = getSettings();

 				createChart();
 			},
 			update: function() {
				var moData = S.read();
				// chart.line.selectAll("path.line")
				// 	.data([moData])
				// 	.enter()
				// 		.append("svg:path")
				// 		.attr({
				// 			"class": "line",
				// 			"d": chart.func.line,
				// 		})
				// // Equals to below

				chart.line.append("svg:path")
					.datum(moData)
					.attr({
						"class": "line",
						"d": chart.func.line,
					})

				function sgn(x) {
					return (x > 0) - (x < 0);
				}

				var g = chart.dot.selectAll("g")
					.data(moData)
					.enter()
					.append("svg:g")
						.attr("transform", chart.func.translate)

				// g.append("rect")
				// 	.style("stroke-width", "0.5px")
				// 	.style("stroke", d3.rgb(31, 119, 180))
				// 	.attr("transform", function(d, i) { return "translate("+(-sgn(d.val)*0.5)+","+(settings.container.height/2)+") rotate("+(-sgn(d.val)*90)+")"; })
				//     .attr("height", 1)
				//     .attr("width", chart.func.v(5))
				//     .transition()
				//     	.duration(800)
				// 		.ease(d3.ease("exp"))
				//     	.attr("width", function(d, i) { return Math.abs(chart.func.l(d.val)); })

				g.append("circle")
					.attr("cx", 0)
					.attr("cy", chart.func.v(0))
					.attr("r", 3.5)
					.style("fill", "white")
					.style("stroke", d3.rgb(31, 119, 180))
					// .transition()
					// 	.duration(800)
					// 	.ease(d3.ease("exp"))
						.attr("cy", function(d) { return chart.func.v(d.val); })

					// .on("mouseover", function(d) {
					// 	var dt = new Date(d.date);
					// 	var dtStr = (dt.getMonth() + 1) + "/" + dt.getDate() + "\n" + d.val;
					// 	var y = v(+d.val);
					// 	if ( v.val > 0 ) y -= 20;
					// 	else y += 20;

					// 	d3.select("#mo-graph .tooltip")
					// 		.style("left", (t(dt) - 35) + "px")
					// 		.style("top", y + "px")
					// 		.transition()
					// 			.duration(500)
					// 			.style("opacity", 1)
					// 			.text(dtStr)
					// })
					// .on("mouseout", function(d) {
					// 	d3.select("#mo-graph .tooltip")
					// 		.style("opacity", 0)
					// })
 			},
 			// zoom 시...
 			render: function() {
 				chart.axis
 					.call(chart.func.axis);

 				chart.axis.selectAll(".tick line")
 					.attr("y1", -6);

 				chart.axis.selectAll(".tick text")
					.style("text-anchor", "start")
					.attr("x", 4)

 				today = d3.time.minute.floor(new Date());
				chart.today
					.attr("transform", "translate(" + chart.func.t(today) + ", 0)")

				chart.line.selectAll("path.line")
					.attr("d", chart.func.line);

				chart.dot.selectAll("g")
					.attr("transform", chart.func.translate)
 			},
 			refreshToday: function() {
 				today = d3.time.minute.floor(new Date());

				chart.today
					.transition()
						.duration(500)
						.attr("transform", "translate(" + chart.func.t(today) + ", 0)")
 			},
 		}

 		return self;
 	})();

// 	function drawGraph() {
// 		GraphPage.drawGraph();
// return;

// 		var t = d3.time.scale()
// 			.domain([first, last])

// 		var v = d3.scale.linear()
// 			.domain([-5, 5])

// 		var s = d3.scale.linear()
// 			.domain([-5, 5])

// 		var axis = d3.svg.axis()
// 			.scale(t)
// 			.tickSize(6, 6)
// 			.tickPadding(6)

// 		//
// 		if ( isLandscape ) {
// 			t.range([0, svg_width]);
// 			v.range([svg_height, 0]);
// 			s.range([-svg_height/2, svg_height/2]);
// 			axis.orient("bottom");

// 		}
// 		else {
// 			t.range([svg_height, 0]);
// 			v.range([padding_v, svg_width - padding_v]);
// 			axis.orient("right");
// 		}

// 		if ( dateIntv < 60 * 60 * 24 ) {
// 			axis
// 				.ticks(d3.time.hours, 12)
// 				.ticks(24);
// 		}
// 		else {
// 			axis.ticks(d3.time.days, 1);
// 		}

// 		if ( isLandscape ) {
// 			// svg.append("svg:g")
// 			// 		.attr("class", "x axis")
// 			// 		.attr("transform", "translate(0," + svg_height/2 + ")")
// 			// 		.call(axis)

// 			// svg.selectAll(".tick line")
// 			// 	.attr("y1", -6)

// 			// svg.selectAll(".tick text")
// 			// 	.style("text-anchor", "start")
// 			// 	.attr("x", 4)

// 		}
// 		else {
// 			svg.append("svg:g")
// 					.attr("class", "x axis")
// 					.attr("transform", "translate(" + svg_width/2 + ",0)")
// 					.call(axis)
// 					.call(function(selection) {
// 						selection.selectAll('.tick')
// 							.attr("transform", function(d, e, f) {
// 								return "translate(-3," + t(d) + ")";
// 							});
// 					})

// 			var line = d3.svg.line()
// 				.x(function (d) {
// 					return v(d.val);
// 				})
// 				.y(function (d) {
// 					return t(new Date(d.date));
// 				});
// 		}


// 		svg.append("svg:path")
// 			.attr({
// 				"class": "line",
// 				// d: line(moData),
// 				// d: (line.interpolate("basis"))(moData),
// 				// d: (line.interpolate("cardinal"))(moData),
// 				// d: (line.interpolate("step-before"))(moData),
// 				// d: (line.interpolate("monotone"))(moData),
// 			})
// 			// .transition()
// 			// 	.duration(moData.length * 20)
// 			// 	.attrTween("d", pathTween)

// 		function pathTween() {
// 			var interpolate = d3.scale.quantile()
// 				.domain([0,1])
// 				.range(d3.range(1, moData.length + 1));

// 			return function(t) {
// 				return (line.interpolate("monotone"))(moData.slice(0, interpolate(t)));
// 			};
// 		}
// 	}

	function onResize() {
		checkWindowSize();
		GraphPage.invalidate();

		if ( !isMobileView ) {
			$("#mo-graph").show();
			$("#mo-input").show();

			InputRange.redraw();
			GraphPage.update();
			return;
		}

		if ( isLandscape ) {
			$("#mo-graph").show();
			$("#mo-input").hide();

			GraphPage.update();
		}
		else {
			$("#mo-graph").hide();
			$("#mo-input").show();
		}

		window.scrollTo(0, 1);
	};

	d3.select(window).on("resize", function() {
		onResize();
	});
	d3.select(window).on("resize")();

	d3.select("button#flip")
		.on("click", function() {
			$(".full-page").toggle();
			if ( $("#mo-graph").is(":visible") )
				GraphPage.update();
			else
				InputRange.redraw();
		})

	d3.select("button#trash")
		.on("click", function() {
			if ( confirm("DELETE?") ) {
				S.clear();
				GraphPage.update();
			}
		})

	// setTimeout(GraphPage.refreshToday, 1000);

	// d3.select("#login").style("margin-left", "0");
	d3.select("#login-form")
		.on("submit", function() {
			d3.event.preventDefault();
			authClient.login('password', {
				email: document.getElementById("login-email").value,
				password: document.getElementById("login-password").value,
				rememberMe: true
			});

			return false;
		})
});
