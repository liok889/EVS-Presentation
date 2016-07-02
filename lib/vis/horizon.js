
var HORIZON_PLOT_ID = 1;
var HORIZON_COLORS = ['rgb(166,189,219)','rgb(116,169,207)','rgb(43,140,190)','rgb(4,90,141)'];

function HorizonPlot(svg, w, h, timeseries, levels)
{
	this.w = w;
	this.h = h;
	this.plotID = HORIZON_PLOT_ID++;

	this.group = svg.append('g');

	// expand the series
	var extents = timeseries.getExtents();
	var extentLen = extents[1]-extents[0];
	var series = timeseries.getSeries();
	var points = [];

	// flatten time series
	var firstPoint, lastPoint;
	for (var i=0, N=series.length; i<N; i++) {
		if (series[i] !== null) {
			firstPoint = {x: i, y: extents[0]};
			break;
		}
	}
	for (var i=series.length-1; i >=0; i--) {
		if (series[i] !== null) {
			lastPoint = {x: i, y: extents[0]};
			break;
		}
	}
	points.push(firstPoint);
	for (var i=0, N=series.length; i<N; i++) {
		var v = series[i];
		if (v !== null) {
			points.push({x: i, y: v});
		}
	}
	points.push(lastPoint);


	// generate level data
	var levelData = [];
	var levelHeight = extentLen/levels;
	for (var i=0; i<levels; i++) {
		levelData.push(
		{
			domainBase: i*levelHeight,
			domainRoof: (i+1)*levelHeight,		
			levelH: this.h/levels,
			plotH: this.h,
			plotID: this.plotID,
			timeseries: points,
			fillColor: HORIZON_COLORS[i]
		});
	}

	// generate clipping rectangle
	var parentSVG = d3.select(getSVG(svg.node()));
	var defs = parentSVG.select('defs');
	if (defs.size() == 0) {
		defs = parentSVG.append('defs');
	}

	var clipPath = defs.append("clipPath")
		.attr("id", "horizonPlot_" + this.plotID);
	clipPath.append("rect")
		.attr("x", 0).attr("y", 0)
		.attr("width", this.w).attr("height", this.h);

	// generate groups
	this.group.selectAll('g.levels').data(levelData).enter().append("g")
		.attr('class', 'levels')
		.attr('transform', function(d, i) {
			return 'translate(' + 0 + ',' + (i*d.plotH) + ')';
		});

	// make scales
	this.yScale = d3.scale.linear()
		.domain([extents[0], extents[1]])
		.range([this.h, -1 * (levels-1) * this.h]);
	this.xScale = d3.scale.linear()
		.domain([0, timeseries.size()-1])
		.range([0, this.w]);

	// generate paths
	(function(plot) {
		plot.pathGenerator = d3.svg.line()
			.interpolate('linear-closed')
			.x(function(d) { return plot.xScale(d.x); })
			.y(function(d) { return plot.yScale(d.y); });

		plot.group.selectAll('g.levels').selectAll('path').data(function(d) { return [d]; }).enter().append('path')
			.attr('d', function(d) { return plot.pathGenerator(d.timeseries); })
			.style("fill", function(d) { return d.fillColor; })
			.style("stroke", "none")
			//.attr("clip-path", function(d, i) { return "url(#" + "horizonPlot_" + d.plotID + ")"; })

	})(this);
}
