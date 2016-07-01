var LINEPLOT_PAD_W = 55;
var LINEPLOT_PAD_H = 20;

var BUTTON_SIZE = 20;

var DEFAULT_OPTIONS = 
{
	startFormZero: false,
	multiscale: false,
	resizable: true,
	stroke_width: 5,
	interpolate: 'basis',
	xAxis: true,
	yAxis: true,

	padW: LINEPLOT_PAD_W,
	padH: LINEPLOT_PAD_H,
	resizeSVG: false,
	hoverCircleR: 9
};

function LinePlot(group, w, h, options)
{
	// options
	this.options = options || {};
	options = this.options;

	// populate default options
	for (var i in DEFAULT_OPTIONS) {
		if (DEFAULT_OPTIONS.hasOwnProperty(i) && options[i] === undefined) {
			options[i] = DEFAULT_OPTIONS[i];
		}
	}

	// initialize
	this.plots = [];
	this.seriesLen = 0;
	this.yRange = null;

	this.w = +w;
	this.h = +h;
	this.group = group;
	

	this.dataGroup = this.group.append("g")
		.attr('class', 'lineplotData');
	this.lineGroup = this.dataGroup.append('g');
	this.hoverBalls = this.group.append('g')
		.attr('transform', 'translate( ' + options.padW + ',' + options.padH + ')');

	this.textGroup = this.group.append("g");
	this.xAxis = this.group.append('g')
		.attr('class', 'axis')
		.attr('transform', 'translate(' + options.padW + ',' + (this.h-options.padH) + ')');

	this.yAxis = this.group.append('g')
		.attr('class', 'axis')
		.attr('transform', 'translate(' + options.padW + ',' + options.padH + ')');

	this.buttonGroup = this.group.append('g');
	if (options.resizable) 
	{
		this.resizeButton = new InlineButton(
		this.buttonGroup,
		this.w - BUTTON_SIZE-1,
		this.h - BUTTON_SIZE-1,
		BUTTON_SIZE, BUTTON_SIZE,
		'img/resize.png'
		);

		// event
		(function(plot) {
			plot.resizeButton.on("resize", function(dMouse) 
			{		
				// calculate new size
				var newW = plot.w + dMouse[0];
				var newH = plot.h + dMouse[1];

				plot.updatePlotSize(newW, newH)
			});
		})(this);

	}
	
	// background rectangle
	this.bgRect= this.group.append('rect')
		.attr('x', options.padW).attr('y', options.padH)
		.attr('width', this.w-options.padW*2).attr('height', this.h-options.padH*2)
		.style("fill", 'white').style('fill-opacity', '0.0');
	(function(plotter) {
		if (plotter.options.hoverCallback) {
			plotter.bgRect
				.on("mousemove", function() 
				{
					// calculate index of time being brushed
					var mouse = d3.mouse( d3.select('body').node() );
					var bounds = this.getBoundingClientRect();
					var nX = (mouse[0]-bounds.left) / (bounds.right-bounds.left);

					var timestep = Math.floor(.5+plotter.xScale.invert(nX));
					plotter.showHoverBalls(timestep);
					plotter.options.hoverCallback(timestep, plotter);
				})
				.on("mouseout", function() {
					plotter.showHoverBalls();
					plotter.options.hoverCallback(undefined, plotter);
				})
		}
	})(this)

	this.xScale = d3.scale.linear().range([0, 1]);
	this.yScale = d3.scale.linear().range([1, 0]);
	this.updateDataTransform();
}

LinePlot.prototype.setYRange = function(yRange) {
	if (yRange)
	{
		this.oldYRange = this.yRange;
		this.yRange = yRange;
	}
	else
	{
		this.yRange = yRange;
	}
	this.updatePlots();
}

LinePlot.prototype.getYRange = function() {
	if (this.oldYRange) {
		return this.oldYRange;
	}
	else
	{
		return this.yRange;
	}
}

LinePlot.prototype.showHoverBalls = function(timestep)
{
	var options = this.options;
	if (timestep === undefined || timestep === null) {
		this.hoverBalls.selectAll('circle').remove();
	}
	else
	{
		var hoverPoints = [];
		for (var i=0; i<this.plots.length; i++) {
			var plot = this.plots[i];
			var timeseries = plot.timeseries.getSeries();
			var val = timeseries[timestep];
			if (val !== null) {

				// add a points
				hoverPoints.push({
					x: (this.w-options.padW*2) * this.xScale(timestep),
					y: (this.h-options.padH*2) * this.yScale(val),
					color: plot.color
				});
			}
		}

		// hover balls
		var hoverUpdate = this.hoverBalls.selectAll('circle').data(hoverPoints);
		hoverUpdate.enter().append('circle');
		hoverUpdate
			.attr('cx', function(d) { return d.x; })
			.attr('cy', function(d) { return d.y; })
			.style('fill', function(d) { return d.color; })
			.style('stroke', 'none')
			.style('r', this.options.hoverCircleR + 'px')
			.attr("vector-effect", "non-scaling-stroke");

		hoverUpdate.exit().remove();
	}
}

LinePlot.prototype.updatePlotSize = function(newW, newH)
{
	this.w = newW;
	this.h = newH;

	this.updateDataTransform();
	this.updatePlots(true);
	if (this.resizeButton) {
		this.resizeButton
			.attr("x", this.w - BUTTON_SIZE-1)
			.attr("y", this.h - BUTTON_SIZE-1);
	}
	if (this.resizeCallback) {
		this.resizeCallback(this.w, this.h);
	}
}

LinePlot.prototype.setDateRange = function(dateRange)
{
	this.dateRange = [
		(typeof dateRange[0] == 'number' || typeof dateRange[0] == 'string') ? new Date(dateRange[0]) : dateRange[0],
		(typeof dateRange[1] == 'number' || typeof dateRange[1] == 'string') ? new Date(dateRange[1]) : dateRange[1]		
	];
	this.updateAxes();
}

LinePlot.prototype.updateAxes = function()
{
	// make an x axis and timescale
	var options = this.options;
	if (this.dateRange)
	{
		var timeScale = d3.time.scale()
			.domain([this.dateRange[0], this.dateRange[1]])
			.range([0, this.w - 2*options.padW]);
		
		var timeAxis = d3.svg.axis()
			.scale(timeScale)
			.tickSize(2)
			.orient(this.options.orientation || 'bottom')
			.tickFormat(d3.time.format(this.options.xAxis ? (this.options.tickFormat || '%Y') : ''));


		this.xAxis
			.attr('transform', 'translate(' + options.padW + ',' + (this.h-options.padH) + ')')
			.call(timeAxis);
	}

	if (this.yRange && this.options.yAxis)
	{
		var yScale = d3.scale.linear()
			.domain([this.yRange[0], this.yRange[1]])
			.range([this.h - 2*options.padH, 0]);
		
		var yAxis = d3.svg.axis()
			.scale(yScale)
			.tickSize(2)
			.orient('left');

		this.yAxis.call(yAxis);
	}
}

LinePlot.prototype.updateDataTransform = function()
{
	var options = this.options;
	var transform = 
		'translate(' + options.padW + ',' + options.padH + ') ' +
		'scale(' + (this.w-2*options.padW) + ', ' + (this.h-2*options.padH) + ') ';
		/*
		'scale(' + (1/(this.seriesLen-1)) + ', ' + (1/(this.yRange[1]-this.yRange[0])) + ') ' +
		'translate(0,' + (-this.yRange[0]) + ')';
		*/

	this.dataGroup
		.attr('transform', transform);
	return transform;
}

LinePlot.prototype.addTimeseries = function(timeseries, name, color)
{
	// convert the series into chunks
	var chunks = chunketizeTimeseries(timeseries).chunks;

	// add to list of plots
	this.plots.push({
		chunks: chunks,
		name: name,
		color: color,
		timeseries: timeseries
	});

	this.yRange = undefined;

	this.updatePlots();
}

LinePlot.prototype.brush = function(index)
{
	this.lineGroup.selectAll('g.plotGroup')
		.style('stroke-opacity', function(d, i) {
			return index !== undefined ? (index == i ? '' : '0.17') : '';
		});
	this.textGroup.selectAll('text')
		.style('fill-opacity', function(d, i) {
			return index !== undefined ? (index == i ? '' : '0.17') : '';
		});
}

LinePlot.prototype.updatePlots = function(textOnly)
{
	// update yRange
	var options = this.options;
	if (!this.yRange)
	{
		this.yRange = [this.options.startFromZero ? 0 : Number.MAX_VALUE, -Number.MAX_VALUE];
		this.seriesLen = 0;
		for (var i=0, N=this.plots.length; i<N; i++) 
		{
			var ts = this.plots[i].timeseries;
			var extents = ts.getExtents();
			this.yRange = [Math.min(this.yRange[0], extents[0]), Math.max(this.yRange[1], extents[1])];
			this.seriesLen = Math.max(this.seriesLen, ts.size());
		}
	}

	// update scales
	this.xScale.domain([0, this.seriesLen-1]);
	this.yScale.domain([this.yRange[0], this.yRange[1]]);

	// make a path generator
	(function(plotter, textOnly) {
		if (!textOnly) {
			plotter.pathGenerator = d3.svg.line().interpolate(plotter.options.interpolate)
				.x(function(d) { return plotter.xScale(d.x); })
				.y(function(d) { return plotter.yScale(d.y); });

			var plotsUpdate = plotter.lineGroup.selectAll("g.plotGroup").data(plotter.plots);
			plotsUpdate.enter().append("g")
				.style("stroke", function(d) { return d.color ? d.color : "white"})
				.style("stroke-width", plotter.options.stroke_width + "px")
				.style("fill", "none")
				.attr('class', 'plotGroup')
				.on("mouseover", function(d, i) {
					plotter.brush(i);
				})
				.on("mouseout", function(d, i) {
					plotter.brush();
				})

			plotsUpdate.exit().remove();
			
			// add the paths
			var pathsUpdate = plotsUpdate.selectAll('path').data(function(d) { return d.chunks })
			pathsUpdate.enter().append("path")
				.attr("vector-effect", "non-scaling-stroke")
			pathsUpdate.transition()
				.attr('d', function(d) { return plotter.pathGenerator(d )});
			pathsUpdate.exit().remove();
		}

		// add textual label
		var textUpdate = plotter.textGroup.selectAll('text').data(plotter.plots)
		textUpdate.enter().append('text')
			.style("font-family", "Helvetica")
			.style("font-size", "15pt")
			.on("mouseover", function(d, i) {
				plotter.brush(i);
				//putNodeOnTop(this);
			})
			.on("mouseout", function(d, i) {
				plotter.brush();
			})

		textUpdate
			.html(function(d) { return d.name; })
			.transition().duration(textOnly ? 0 : 250)
			.style("fill", function(d) { return d.color ? d.color : 'white'; })
			.attr("x", function(d) {
				var c = d.chunks[d.chunks.length-1];
				var p = c[c.length-1];
				return plotter.xScale(p.x)*(plotter.w-2*options.padW)+options.padW+5;
			})
			.attr("y", function(d) {
				var c = d.chunks[d.chunks.length-1];
				var p = c[c.length-1];
				return plotter.yScale(p.y)*(plotter.h-2*options.padH)+options.padH;
			})
			.attr("vector-effect", "non-scaling-stroke");
		textUpdate.exit().remove()


	})(this, textOnly);
	this.updateAxes();
}

LinePlot.prototype.getSeriesCount = function() {
	return this.plots.length;	
}

LinePlot.prototype.avgSegmentOrientation = function(index)
{
	var options = this.options;
	var MAX_SEGMENT_COUNT = 2000;
	var orientations = [];
	
	for (var i=0; i<this.plots.length; i++) 
	{
		if (index !== undefined && index !== null && i!=index) {
			continue;
		}

		var THETA = 0, count=0;
		var series = this.plots[i].timeseries.getSeries();
		var stride = series.length > MAX_SEGMENT_COUNT * 2 ? 
			Math.floor(series.length / MAX_SEGMENT_COUNT + .5) : 1;
		
		for (var j=0; j<series.length; j+= stride) {
			var v1 = series[j];
			var v2 = series[j+stride];
			if (v1 !== null && v2 !== null && v1 !== undefined && v2 !== undefined) {
				var p1 = { x: this.xScale(j) * (this.w-options.padW*2),        y: (1-this.yScale(v1)) * (this.h-options.padH*2) };
				var p2 = { x: this.xScale(j+stride) * (this.w-options.padW*2), y: (1-this.yScale(v2)) * (this.h-options.padH*2) };
				
				// calcuate angle between p1 and p2
				var theta = angle(p1.x, p1.y, p2.x, p2.y);
				if (!isFinite(theta)) {
					console.log("\n\nINFINITY\n\n");
				}
				else
				{
					THETA += Math.abs(theta);
					count++;
				}
			}
		}
		THETA /= count;
		orientations.push(THETA);
		if (index !== undefined && index !== null && i===index) {
			return THETA;
		}
	}

	return orientations;
}

LinePlot.prototype.setResizeCallback = function(callback) {
	this.resizeCallback = callback;
}

function angle(cx, cy, ex, ey) 
{
	var dy = ey - cy;
	var dx = ex - cx;
	var theta = Math.atan2(dy, dx); // range (-PI, PI]
	theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
	return theta;
}


LinePlot.prototype.popTimeseries = function()
{
	this.plots.pop();
	this.yRange = undefined;
	this.updatePlots();
}

LinePlot.prototype.updateTimeseries = function(index, timeseries)
{
	this.plots[index].timeseries = timeseries;
	this.plots[index].chunks = chunketizeTimeseries(timeseries).chunks;
	this.yRange = undefined;
	this.updatePlots();
}

function chunketizeTimeseries(timeseries)
{
	var chunks = [], chunk = null, points = [];
	var series = timeseries.getSeries();
	for (var i=0, N=timeseries.size(); i<=N; i++) 
	{
		var v = series[i];
		if (v !== null && v !== undefined) {
			if (!chunk) { 
				chunk = [];
			}
			chunk.push({x: i, y: v});
		}
		else
		{
			if (chunk) 
			{
				if (chunk.length == 1) {
					points.push({x: i, y: v});
				}
				else
				{
					chunks.push(chunk);
				}
				chunk = null;
			}
		}
	}
	// last chunk
	if (chunk) {
		if (chunk.length > 1) {
			chunks.push(chunk);
		}
		else {
			points.push(chunk[0]);
		}
	}

	return {
		chunks: chunks,
		points: points
	};

}
