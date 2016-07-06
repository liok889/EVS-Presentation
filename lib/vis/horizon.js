
var HORIZON_PLOT_ID = 1;
/*
var HORIZON_COLORS = ['rgb(166,189,219)','rgb(116,169,207)','rgb(43,140,190)','rgb(4,90,141)'];
var HORIZON_COLORS_OVER = ['#fef0d9','#fdcc8a','#fc8d59','#e34a33','#b30000'];
*/
var HORIZON_COLORS_OVER	= ['#fed976','#feb24c','#fd8d3c','#f03b20','#bd0026'];
var HORIZON_COLORS 		= ['#c7e9b4','#7fcdbb','#41b6c4','#2c7fb8','#253494'];
function HorizonPlot(svg, w, h, timeseries, levels, center, globalExtents)
{
	if (levels === null || isNaN(levels) || levels > HORIZON_COLORS.length) {
		levels = HORIZON_COLORS.length;
	}

	this.w = w;
	this.h = h;
	this.plotID = HORIZON_PLOT_ID++;

	this.group = svg.append('g');
	this.dataGroup = this.group.append('g')
		// default fill is light blue
		.style('fill', HORIZON_COLORS[0])
		.style('stroke', 'none');

	// figure out extents
	var extents = globalExtents || timeseries.getExtents();
	var extentLen;
	var centered;

	if (center !== undefined && center !== null) {
		extentLen = Math.max(Math.abs(extents[1]-center), Math.abs(extents[0]-center));
		centered = true;
	}
	else
	{
		extentLen = extents[1]-extents[0];
		center = extents[0];
		centered = false;
	}

	// expand the series
	var series = timeseries.getSeries();
	var points = [];
	var chunks = [];
	var curChunk = null;

	// flatten time series
	var firstPoint, lastPoint;
	for (var i=0, N=series.length; i<N; i++) 
	{
		var val = series[i];
		if (val !== null && val !== undefined) 
		{
			var direction = !centered ? -1 : val >= center ? 1 : -1;
			var nVal = Math.abs(val - center) / extentLen;
			if (!curChunk) 
			{
				curChunk = {
					direction: direction,
					vertices: [ {x: i, y: 0}, {x: i, y: nVal} ]
				};
			}
			else if (curChunk.direction == direction) {
				curChunk.vertices.push({x: i, y: nVal});
			}
			else
			{
				// change of direction around the center detected
				// calculate intersection point between x0, x1 at the center
				var v0 = curChunk.vertices[ curChunk.vertices.length-1 ];
				var x0 = v0.x;
				var y0 = v0.y * curChunk.direction;
				var x1 = i;
				var y1 = nVal * direction;

				var m  = (y1-y0)/(x1-x0);	// m should never be zero
				var b  = y0-m*x0;
				var xI = -b/m;
				
				// terminate current chunk
				curChunk.vertices.push({x: xI, y: 0});
				chunks.push(curChunk);

				// start a new chunk
				curChunk = {
					direction: direction,
					vertices: [ {x: xI, y: 0}, {x: i, y: nVal} ]
				};
			}
		}
	}

	if (curChunk) {
		// terminate chunk
		var lastV = curChunk.vertices[ curChunk.vertices.length-1 ];
		curChunk.vertices.push({x: lastV.x, y: 0});
		chunks.push(curChunk);
		curChunk = null;
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


	// generate levels
	var levelData = [];
	for (var i=0; i<levels; i++) {
		levelData.push(
		{
			level: i,
			chunks: chunks,
		});
	}

	// make scales
	this.yScale = d3.scale.linear()
		.domain([0, 1])
		.range([this.h, -1 * (levels-1) * this.h]);
	this.xScale = d3.scale.linear()
		.domain([0, timeseries.size()-1])
		.range([0, this.w]);

	// generate groups
	(function(plot, levelData) {
		
		// make one 'g' for each level and set its translation and clipping
		var levelsG = plot.dataGroup.selectAll('g.levels').data(levelData).enter().append("g")
			.attr('class', 'levels')
			.attr("clip-path", function(d, i) { return "url(#" + "horizonPlot_" + plot.plotID + ")"; })
			.attr('transform', function(d, i) {
				return 'translate(' + 0 + ',' + -(d.level * plot.h) + ')';
			});
	
		// path generator
		plot.pathGenerator = d3.svg.line()
			.interpolate('linear-closed')
			.x(function(d) { return plot.xScale(d.x); })
			.y(function(d) { return plot.yScale(d.y); });

		// now make paths under levelsG
		levelsG.selectAll('path').data(function(d) 
		{ 
			var pathList = [];
			for (var i=0, N=d.chunks.length; i<N; i++) 
			{
				pathList.push({
					level: d.level,
					vertices: d.chunks[i].vertices,
					direction: d.chunks[i].direction
				});
			}
			return pathList;
		}).enter().append('path')
			.attr("vector-effect", "non-scaling-stroke")
			.attr('d', function(d) { 
				return plot.pathGenerator(d.vertices); 
			})
			.attr('transform', function(d, i) {
				return 'translate(' + 0 + ',' + (d.level * plot.h) + ')';
			});

	})(this, levelData);
}

HorizonPlot.prototype.drawTimeAxis = function(startDate, endDate, timeFormat)
{
	var timeScale = d3.time.scale()
		.domain([startDate, endDate])
		.range([0, this.w]);

	var timeAxis = d3.svg.axis()
		.scale(timeScale)
		.tickSize(2)
		.orient('bottom')
		.tickFormat(d3.time.format(timeFormat || '%Y'));
	
	if (!this.xAxis) {
		this.xAxis = this.group.append("g")
			.attr('transform', 'translate(0,' + this.h + ')')
			.attr('class', 'axis');
	}
	this.xAxis
		.call(timeAxis);
}

HorizonPlot.prototype.deploy = function(transition)
{
	var levels = this.dataGroup.selectAll('g.levels');
	if (transition) {
		levels = levels.transition().duration(1000);
	}

	levels
		.attr('transform', 'translate(0,0)');

	levels.selectAll('path')
		.style('fill', function(d) { 
			return d.direction > 0 ? HORIZON_COLORS_OVER[d.level] : HORIZON_COLORS[d.level];
		});
	return this;
}

HorizonPlot.prototype.colorBands = function(color)
{
	var selection = this.dataGroup.selectAll('g.levels').selectAll('path').transition().duration(1000)
	if (color) {
		selection.style('fill', color);
	}
	else
	{
		selection.style('fill', function(d) { 
			return d.direction > 0 ? HORIZON_COLORS_OVER[d.level] : HORIZON_COLORS[d.level];
		});
	}
	return this;
}

HorizonPlot.prototype.expandBands = function()
{
	(function(plot) {
		plot.dataGroup.selectAll('g.levels').transition().duration(1000)
		.attr('transform', function(d, i) {
			return 'translate(' + 0 + ',' + -(d.level * plot.h) + ')';
		});
	})(this);
	return this;
}

HorizonPlot.prototype.collapseBands = function()
{
	this.group.selectAll('g.levels').transition().duration(1000)	
		.attr('transform', 'translate(0,0)');
	return this;
}

