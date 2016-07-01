
var PLOT_PAD_W = 15;
var PLOT_PAD_H = 1;
var PLOT_DIST_BINS = 10;
var PLOT_DIST_W = 40;

var PLOT_COUNTER = 0;
var globalXScale = null;
var globalXDomain = null;
var globalZoom = null;
var globalTimeScale = null;
var tDomain = null;
var plotList = [];
var timeAxis = null;

var lastSelectedPlot = undefined;

// control rectangel to resize
var RESIZE_RECT_SIZE = 10;
var MIN_PLOT_H = 20;
var MIN_PLOT_W = 40;
var MAX_PLOT_W = 2000;
var MAX_PLOT_H = 500;

// by default don't show distribution
var SHOW_DISTRIBUTION = false;

function drawTimeAxis(group, startDate, endDate, width, pad, orientation)
{
	if (!globalTimeScale)
	{
		tDomain = [startDate, endDate];
		globalTimeScale = d3.time.scale()
			.domain([startDate, endDate])
			.range([0, width - (pad !== undefined ? pad*2 : PLOT_PAD_W*2) ]);
		
		globalXAxis = d3.svg.axis()
			.scale(globalTimeScale)
			.orient(orientation || 'top')
			.tickFormat(d3.time.format('%m/%d'))
			.tickSize(2)

		timeAxis = group.append('g')
			.attr('class', 'timeAxis')
			.attr('transform', 'translate(' + (pad !== undefined ? pad : PLOT_PAD_W) + ',0)')
			.call(globalXAxis);
	}
	else
	{
	}
}

function TimeseriesPlot(svg, parentSVG, w, h, brushCallback, offset)
{
	this.group = svg;
	this.w = w;
	this.h = h;
	this.brushCallback = brushCallback;
	this.yControl = [0, 1];

	// create a clipping path for this
	plotList.push(this);
	this.clipPathID = PLOT_COUNTER;
	PLOT_COUNTER++;
	
	// clipping path / rectangle
	this.clipPath = parentSVG.select("defs").append("clipPath")
		.attr("id", "plotClip" + this.clipPathID);
	this.clipRect = this.clipPath.append("rect");		

	// groups
	// plot group
	this.plotGroup = this.group.append("g")
		.attr("clip-path", "url(#" + "plotClip" + this.clipPathID + ")")
		.attr("transform", "translate(" + PLOT_PAD_W + "," + PLOT_PAD_H + ")");	

	// control group
	this.controlGroup = this.group.append("g");

	(function(thisPlot)
	{
		var EDGE_SIZE = 3;
		var MIN_WIDGET_SIZE = 10;

		thisPlot.yControlMid = thisPlot.controlGroup.append("rect")
			.attr("y", PLOT_PAD_H).attr("x", 0)
			.attr("width", 11).attr("height", thisPlot.h - 2*PLOT_PAD_H)
			.style("stroke", "none").style("stroke-width", "1px")
			.style("fill", "#b3d9ff")
			.style("shape-rendering", "crispEdges")
			.on("mouseover", function() { d3.select(this).style("stroke", "red"); })
			.on("mouseout", function() { d3.select(this).style("stroke", "none"); })
			.on("mousedown", function() 
			{ 

				if (!thisPlot.yScale) {
					return;
				}
				lastSelectedPlot = thisPlot;
				thisPlot.dragYControl = 1; 
				thisPlot.mouseDown = d3.mouse(thisPlot.controlGroup.node());
				
				var mouse = d3.mouse(this); mouse[1] -= +d3.select(this).attr("y")

				
				if (mouse[1] <= EDGE_SIZE) {
					// top edge					
					thisPlot.dragYControl = 2;

				}
				else if (mouse[1] >= +d3.select(this).attr("height")-EDGE_SIZE)
				{
					// bottom edge
					thisPlot.dragYControl = 3;
				}
				else
				{
					// middle
					thisPlot.dragYControl = 1;
				}

				d3.select(document)
					.on("mousemove.dragYControlMid", function() 
					{
						var mode = thisPlot.dragYControl;
						var mouse = d3.mouse(thisPlot.controlGroup.node());
						var dY = mouse[1] - thisPlot.mouseDown[1];	
							
						// control widget
						var widget = thisPlot.yControlMid;
						var y = +widget.attr("y");
						var h = +widget.attr("height");
						thisPlot.mouseDown = mouse;

						if (dY > 0) {
						
							if (mode == 1)
							{
								var openSpace = (thisPlot.h - PLOT_PAD_H) - (y + h);
								if (openSpace > 0) {
									dY = Math.min(openSpace, dY);
									y += dY;
									widget.attr("y", y);
								}
							}
							else if (mode == 2)
							{
								var openSpace = h-MIN_WIDGET_SIZE;
								if (openSpace > 0) {
									dY = Math.min(openSpace, dY);
									y += dY; h -= dY
									widget.attr("y", y);
									widget.attr("height", h);
								}
							}
							else if (mode == 3)
							{
								var openSpace = (thisPlot.h - PLOT_PAD_H) - (y + h);
								if (openSpace > 0) {
									dY = Math.min(openSpace, dY);
									h += dY;
									widget.attr("height", h);									
								}

							}
						}
						else if (dY < 0)
						{
							if (mode == 1)
							{
								var openSpace = y - PLOT_PAD_H;
								if (openSpace > 0) {
									dY = Math.min(openSpace, -dY);
									y -= dY;
									widget.attr("y", y);
								}
							}
							else if (mode == 2)
							{
								var openSpace = y - PLOT_PAD_H;
								if (openSpace > 0) {
									dY = Math.min(openSpace, -dY);
									y -= dY; h += dY
									widget.attr("y", y);
									widget.attr("height", h);
								}									
							}
							else if (mode == 3)
							{
								var openSpace = h-MIN_WIDGET_SIZE;
								if (openSpace > 0) {
									dY = Math.min(openSpace, dY);
									h += dY
									widget.attr("height", h);
								}							
							}
						}

						if (dY != 0) {
							thisPlot.updateYScale(y, h);
						}
					})
					.on("mouseup.dragYControlMid", function() {
						thisPlot.dragYControl = undefined;
						d3.select(document).on("mouseup.dragYControlMid", null).on("mousemove.dragYControlMid", null);
					});
			});
	})(this);

	// distribution
	this.distributionGroup = this.group.append("g");

	// decoration group
	this.decorationGroup = this.group.append("g");

	this.decorationRect = this.decorationGroup.append("rect")
		.style("stroke", "white")
		.style("stroke-width", "1px")
		.style("fill", "white").style("fill-opacity", "0.0")
		.style("shape-rendering", "crispEdges");

	this.resizeRect = this.decorationGroup.append("rect")
		.attr('width', RESIZE_RECT_SIZE)
		.attr('height', RESIZE_RECT_SIZE)
		.style("fill", "red").style("fill-opacity", "0.0").style("stroke", "none")
		.on("mouseover", function() { d3.select(this).style("fill-opacity", "0.4"); })
		.on("mouseout", function() { d3.select(this).style("fill-opacity", "0.0"); });

	(function(thisPlot, resizeRect) 
	{
		resizeRect.on("mousedown", function() 
		{
			thisPlot.resizing = true;
			thisPlot.mouseDown = d3.mouse(thisPlot.decorationGroup.node());
			d3.select(document).on("mousemove.resizeRect", function() {

				var mouse = d3.mouse(thisPlot.decorationGroup.node());
				var dMouse = [mouse[0]-thisPlot.mouseDown[0], mouse[1]-thisPlot.mouseDown[1]];
				thisPlot.mouseDown = mouse;

				var freedom = [
					dMouse[0] > 0 ? Math.min(MAX_PLOT_W-thisPlot.w, dMouse[0]) : dMouse[0] < 0 ? -Math.min(thisPlot.w-MIN_PLOT_W, -dMouse[0]) : 0,
					dMouse[1] > 0 ? Math.min(MAX_PLOT_H-thisPlot.h, dMouse[1]) : dMouse[1] < 0 ? -Math.min(thisPlot.h-MIN_PLOT_H, -dMouse[1]) : 0	
				];

				// don't allow horizontal resizing for now
				freedom[0]=0;


				if (freedom[0] != 0 || freedom[1] != 0)
				{
					thisPlot.w += freedom[0];
					thisPlot.h += freedom[1];
					thisPlot.resize();
					if (thisPlot.yScale) {
						thisPlot.yScale.range([thisPlot.h-PLOT_PAD_H*2, 0])
					}
				}
				d3.event.stopPropagation();
			})
			.on("mouseup.resizeRect", function() {
				thisPlot.resizing = undefined;
				d3.select(document)
					.on("mousemove.resizeRect", null)
					.on("mouseup.resizeRect", null);
			});
		})
	})(this, this.resizeRect);

	(function(group, thisPlot) 
	{
		group.on("mousemove", function() 
		{
			if (thisPlot.brushCallback && thisPlot.timeseries && !thisPlot.resizing) {
				var mouseX = d3.mouse(this)[0];
				if (mouseX >= PLOT_PAD_W && mouseX <= thisPlot.w-PLOT_PAD_W) 
				{
					var X = mouseX-PLOT_PAD_W;
					var brushedIndex = Math.floor( globalXScale.invert(X) + .5 );
					brushedIndex = Math.min(thisPlot.timeseries.size()-1, brushedIndex);
					thisPlot.brushCallback( brushedIndex, X );
				}
			}
		})
		.on("mouseout", function() {
			if (thisPlot.brushCallback) {
				thisPlot.brushCallback();
			}
		});
	})(this.decorationGroup, this);

	// Y axis
	this.yAxisGroup = this.group.append("g")
		.attr("class", "timeAxis")
		.attr("transform", "translate(-2," + PLOT_PAD_H + ")");

	// initialize sizes of things
	this.resize();
}


TimeseriesPlot.prototype.resize = function()
{
	this.clipRect
		.attr("width", this.w - PLOT_PAD_W*2)
		.attr("height", this.h - PLOT_PAD_H*2);
		
	this.controlGroup
		.attr("transform", "translate(" + (this.w+2) + ",0)");



	// distribution
	this.distributionGroup
		.attr("transform", "translate(" + (this.w+15) + "," + PLOT_PAD_H + ")");
	if (SHOW_DISTRIBUTION) {
		this.plotDistribution();
	}

	// decoration
	this.decorationRect
		.attr("width", this.w)
		.attr("height", this.h);	

	// control rectangel to resize
	this.resizeRect
		.attr("x", this.w-RESIZE_RECT_SIZE)
		.attr("y", this.h-RESIZE_RECT_SIZE);

	// update control widget
	if (this.yScale)
	{
		var s = d3.scale.linear().domain([PLOT_PAD_H, this.h-PLOT_PAD_H]).range([1, 0]);

		var yDomain = this.yScale.domain();
		var y2 = s.invert(yDomain[0])
		var y1 = s.invert(yDomain[1]);
		this.yControlMid
			.attr("y", y1)
			.attr("height", y2-y1);
	}
	else
	{
		// default covers the entire height
		this.yControlMid
			.attr("y", PLOT_PAD_H)
			.attr("height", this.h - 2*PLOT_PAD_H);		
	}
	
	// update the Y scale
	if (this.yScale) {
		this.updateYScale();
	}

	if (this.resizeCallback) {
		this.resizeCallback(this);
	}
}
TimeseriesPlot.prototype.setResizeCallback = function(callback)
{
	this.resizeCallback = callback;
}

TimeseriesPlot.prototype.moveYControlWidget = function(dY)
{
	var widget = this.yControlMid;
	var y = +widget.attr("y");
	var h = +widget.attr("height");	
	var upated = false;

	if (dY < 0)
	{
		var openSpace = y - PLOT_PAD_H;
		if (openSpace > 0) {
			dY = Math.min(openSpace, -dY);
			y -= dY;
			widget.attr("y", y);
			updated = true;
		}
	}
	else if (dY > 0)
	{
		var openSpace = (this.h - PLOT_PAD_H) - (y + h);
		if (openSpace > 0) {
			dY = Math.min(openSpace, dY);
			y += dY;
			widget.attr("y", y);
			updated = true;
		}
	}

	if (updated) {
		this.updateYScale(y, h);
	}
}
TimeseriesPlot.prototype.updateYScale = function(y, h)
{
	// map
	if (y !== undefined && y !== null && h !== undefined && h !== null)
	{
		var s = d3.scale.linear().domain([PLOT_PAD_H, this.h-PLOT_PAD_H]).range([1, 0]);
		var yControl = [s(y+h), s(y)];
		this.yScale.domain(yControl);
	}
	this.update();

	// create a new scale based on the original values
	var nYDomain = this.yScale.domain();
	var mapper = d3.scale.linear().domain([0, 1]).range(this.timeseries.getOriginalExtents());
	this.originalYScale = d3.scale.linear()
		.domain([ mapper(nYDomain[0]), mapper(nYDomain[1])])
		.range(this.yScale.range());

	// update y axis
	var yAxis = d3.svg.axis()
		.orient("left")
		.scale(this.originalYScale)
		.ticks(4)
		.tickSize(3);
	this.yAxisGroup.call(yAxis);
}

TimeseriesPlot.prototype.clearPlot = function()
{
	this.timeseries = undefined;
	this.plotGroup.selectAll("*").remove();
	this.distributionGroup.selectAll("*").remove();
}

TimeseriesPlot.prototype.remove = function()
{
	this.plotGroup.remove();
	this.distributionGroup.remove();
	this.decorationGroup.remove();
	this.clipPath.remove();

	// remove myself from plot list
	for (var i=0, N=plotList.length; i<N; i++) 
	{
		var plot = plotList[i];
		if (plot == this) 
		{
			plotList.splice(i, 1);
		}
	}
}

TimeseriesPlot.prototype.brushIndex = function(brushedIndex)
{
	this.brushedIndex = undefined;
	if (!brushedIndex && this.brushCircle) {
		this.brushCircle.remove();
		this.brushCircle = undefined;

	}
	if (!brushedIndex && this.brushText)
	{
		this.brushText.remove();
		this.brushText = undefined;
	}
	else if (this.timeseries)
	{
		var v = this.timeseries.series[brushedIndex];
		if (v !== null && v !== undefined) {
			if (!this.brushCircle) {
				this.brushCircle = this.plotGroup.append("circle");
			}
			this.brushCircle
				.attr("class", "brushCircle")
				.style("fill", "red")
				.attr("cx", globalXScale(brushedIndex))
				.attr("cy", this.yScale(v))
				.attr("r", "3px");

			if (!this.brushRect) {
				this.brushRect = this.plotGroup.append("rect");
			}

			if (!this.brushText) {
				this.brushText = this.plotGroup.append("text");
			}

			var oe = this.timeseries.getOriginalExtents();
			var actualV = v*(oe[1]-oe[0]) + oe[0];

			this.brushText
				.attr("class", "brushCircle")
				.style("font-family", "Helvetica").style("font-weight", "bold")
				.style("font-size", "8pt").style("fill", "red").style("stroke", "none")
				.style("background-color", "white")
				.attr("x", 0)
				.html(actualV.toFixed(2));
			this.brushText.transition().duration(150).attr("y", this.yScale(v))

			SVGRect = this.brushText.node().getBBox();
			this.brushRect
				.attr("class", "brushCricle")
				.attr("x", SVGRect.x)
				.attr("width", SVGRect.width)
				.attr("height", SVGRect.height+2)
				.style("fill", "white");
			this.brushRect.transition().duration(150).attr("y", this.yScale(v)-SVGRect.height+1)

		}
		this.brushedIndex = brushedIndex;
	}
}

TimeseriesPlot.prototype.getSeriesLength = function()
{
	if (this.timeseries) {
		return this.timeseries.getSeries().length;
	}
	else
	{
		return null;
	}
}

TimeseriesPlot.prototype.plotLineGraph = function(timeseries, name)
{
	this.timeseries = timeseries;
	var series = timeseries.getSeries();
	var N = series.length;

	// distribution of the time series
	this.distribution = []; this.distribution.length=PLOT_DIST_BINS+1;
	for (var i=0; i<=PLOT_DIST_BINS; i++) {
		this.distribution[i]=0;
	}

	// make chunks based on data availability
	var chunk = null, chunks = [];
	var points = [];

	for (var i=0; i<=N; i++) {
		var v = series[i];
		if (v !== null && v !== undefined) {
			if (!chunk) chunk = [];
			chunk.push({x: i, y: v});
			this.distribution[ Math.min(PLOT_DIST_BINS-1, Math.floor(v * PLOT_DIST_BINS)) ]++;

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
			if (i<N) this.distribution[ PLOT_DIST_BINS ]++;
		}
	}

	// deal with distribution
	this.distribution.pop();
	this.distribution.reverse();


	// make scales and path generators
	if (!globalXScale) {
		globalXScale = d3.scale.linear()
			.domain([0, N-1])
			.range([0, this.w-PLOT_PAD_W*2]);
		globalXDomain = [0, N-1];
	}
	this.yScale = d3.scale.linear()
		.domain([0, 1]).range([this.h-PLOT_PAD_H*2, 0]);
	this.updateYScale();

	if (!globalZoom) {
		globalZoom = d3.behavior.zoom()
			.x(globalXScale)
			.on("zoomstart", function() {
				showBrushCircles(false);
			})
			.on("zoomend", function() {
				showBrushCircles(true);
			})
			.on("zoom", function() {
				zoomAll();
			});
	}
	this.decorationGroup.call(globalZoom);
	
	this.pathGenerator = (function(N, xScale, yScale) 
	{
		return d3.svg.line()
			.x(function(d) { return xScale(d.x); })
			.y(function(d) { return yScale(d.y); });

	})(N, globalXScale, this.yScale);

	var update = this.plotGroup.selectAll("path").data(chunks);
	update.enter().append("path")
		.attr("class", "lineGraph");

	(function(pathGenerator, update) {
		update
			.attr("d", function(d) { return pathGenerator(d);});
	})(this.pathGenerator, update);

	// exit
	update.exit().remove();
	this.chunksSelection = update;
}

TimeseriesPlot.prototype.update = function()
{
	if (this.chunksSelection)
	{
		(function(thisPlot) {
			thisPlot.chunksSelection.attr("d", function(d) { return thisPlot.pathGenerator(d); });
		})(this);
		if (this.brushedIndex) {
			this.brushIndex(this.brushedIndex);
		}
	}
}

TimeseriesPlot.prototype.plotDistribution = function()
{
	if (this.distribution)
	{
		var update = this.distributionGroup.selectAll("rect").data(this.distribution);
		update.enter().append("rect").attr("class", "distRect");

		(function(h, update, distMax) {
			update
				.attr("y", function(d, i) { return i*h/PLOT_DIST_BINS; })
				.attr("height", h/PLOT_DIST_BINS)
				.attr("width", function(d, i) { return i==PLOT_DIST_BINS ? 0 : (distMax > 0 ? d/distMax : 0)*PLOT_DIST_W; });

		})(this.h-PLOT_PAD_H*2, update, d3.max(this.distribution));
		update.exit().remove();
	}
}

function zoomAll()
{
	for (var i=0, N=plotList.length; i<N; i++) {
		if (plotList[i]) {
			plotList[i].update();
		}
	}

	var xDomain = globalXScale.domain();
	var transfer = d3.scale.linear()
		.domain(globalXDomain)
		.range([tDomain[0].getTime(), tDomain[1].getTime()]);
	
	var newTimeDomain = [new Date(transfer(xDomain[0])), new Date(transfer(xDomain[1]))];
	globalTimeScale.domain(newTimeDomain);
	var days = (newTimeDomain[1].getTime() - newTimeDomain[0].getTime()) / (24*60*60*1000);
	if (days <= 7) {
		globalXAxis.tickFormat(d3.time.format('%m/%d %H:%M'));
	}
	else
	{
		globalXAxis.tickFormat(d3.time.format('%m/%d'));
	}
	timeAxis.call(globalXAxis);

}

function slideYControlWidget(delta)
{
	if (lastSelectedPlot) {
		lastSelectedPlot.moveYControlWidget(delta);
	}
}

function showBrushCircles(visible)
{
	for (var i=0, N=plotList.length; i<N; i++) {
		if (plotList[i]) 
		{
			plotList[i].plotGroup.selectAll(".brushCircle")
				.style("visibility", visible ? "visible" : "hidden");
		}
	}
}



















