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

	var moData = S.read();

	var width = $(window).width(), height = $(window).height();
	var padding_y = 50;
	var td = new Date();
	var today = new Date(td.getFullYear(), td.getMonth(), td.getDate());
	var first = new Date(td.getFullYear(), td.getMonth(), td.getDate());
	first.setDate(today.getDate() - 6);
	var last = new Date(td.getFullYear(), td.getMonth(), td.getDate());
	last.setDate(today.getDate() + 7);

	var x = d3.time.scale()
		.domain([first, last])
		.range([0, width]);

	var y = d3.scale.linear()
		.domain([-5, 5])
		.range([height - padding_y, padding_y]);

	var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

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
		// .interpolate("basis");
		// .interpolate("monotone");

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

	// $("#mo-graph").show();
	$("#mo-input").show();

	// $("input[type=range].vertical").width("200px");

	$("#input-val").on('input', function() {
		$("button.range-value").text($(this).val());
	});

	$("#input-val").change(function() {
		S.write($(this).val());
	});

	$("button#flip").click(function() {
		$(".full-page").toggle();
	});
});
