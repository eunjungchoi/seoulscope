$(function() {
	var S = {
		write: function(val) {
			var data = this.read(localStorage.getItem("MODATA"));

			data.push({
				date: new Date().toJSON(),
				val: val
			});

			localStorage.setItem("MODATA", JSON.stringify(data));
		},
		read: function() {
			return JSON.parse(localStorage.getItem("MODATA")) || [];
		}
	}

	function draw() {
		var moData = S.read();

		var width = $(window).width(), height = $(window).height();
		var padding_y = 50;

		var td = new Date();
		var today = new Date(td.getFullYear(), td.getMonth(), td.getDate());

		var dateMin = new Date(d3.min(moData, function(d) {return d.date}));
		var dateMax = new Date(d3.max(moData, function(d) {return d.date}));
		var dateIntv = (dateMax.getTime() - dateMin.getTime()) / 1000;

		var first, last;
		if ( dateIntv < 60 * 60 * 24 ) {
			first = new Date(dateMin.getFullYear(), dateMin.getMonth(), dateMin.getDate());
			first.setDate(today.getDate());
			last = new Date(td.getFullYear(), td.getMonth(), td.getDate());
			last.setDate(today.getDate() + 1);
		}
		else {
			first = new Date(td.getFullYear(), td.getMonth(), td.getDate());
			first.setDate(today.getDate() - 3);
			last = new Date(td.getFullYear(), td.getMonth(), td.getDate())
			last.setDate(today.getDate() + 4);
		}

		var x = d3.time.scale()
			.domain([first, last])
			.range([0, width]);

		var y = d3.scale.linear()
			.domain([-5, 5])
			.range([height - padding_y, padding_y]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom");

		if ( dateIntv < 60 * 60 * 24 ) {
			xAxis.ticks(d3.time.hours, 12);
		}
		else {
			xAxis.ticks(d3.time.days, 1);
		}


		svg = d3.select("#mo-graph").append("svg")
				.attr("width", width)
				.attr("height", height)
			.append("g")

		svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height/2 + ")")
				.call(xAxis)
				.call(function(selection) {
					selection.selectAll('.tick')
						.attr("transform", function(d, e, f) {
							return "translate("+x(d)+",-3)";
						});
				})

		var line = d3.svg.line()
			.x(function (d) {
				return x(new Date(d.date));
			})
			.y(function (d) {
				return y(d.val);
			});

		svg.append("svg:path")
			.attr({
				d: line(moData),
				"stroke": "white",
				"stroke-width": 2,
				"fill": "none",
				"class": "path",
			});

		svg.append("svg:path")
			.attr({
				d: (line.interpolate("basis"))(moData),
				"stroke": "blue",
				"stroke-width": 2,
				"fill": "none",
				"class": "path"
			});

		svg.append("svg:path")
			.attr({
				d: (line.interpolate("monotone"))(moData),
				"stroke": "red",
				"stroke-width": 2,
				"fill": "none",
				"class": "path"
			});
	}

	$("#input-val").on('input', function() {
		$("button.range-value").text($(this).val());
	});

	$("#input-val").change(function() {
		S.write($(this).val());
	});

	$("button#flip").click(function() {
		$(".full-page").toggle();
	});

	function orientationchange() {
		var orientation = window.orientation || (window.orientation === undefined) ? 90 : 0;

		switch ( orientation ) {
			case 90:
			case -90:
				$("#mo-graph").show();
				$("#mo-input").hide();
				draw();
				break;
			default:
				$("#mo-graph").hide();
				$("#mo-input").show();
				break;
		}

		window.scrollTo(0, 1);
	}

	$(window).on("orientationchange", function(event) {
		orientationchange();
	});

	orientationchange();

	function arrangeRange() {
	}
});
