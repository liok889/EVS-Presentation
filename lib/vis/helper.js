function visLinePlot(svgID, timeseries, options)
{
	var svg = d3.select(typeof svgID == 'string' ? "#" + svgID : svgID);
	var w = +svg.attr('width');
	var h = +svg.attr('height');

	if (!options.hoverCallback) {
		options.hoverCallback = function() {};
	}

	var linePlot = new LinePlot(svg, w, h, options);
	linePlot.addTimeseries(timeseries, undefined, '#80d4ff');
	return linePlot;
}

function makeTimeSeries(svg, _TS_N, _TS_M, _TS_W, _TS_H)
{
	var TS_N = _TS_N || 2;
	var TS_M = _TS_M || 20;
	var TS_W = _TS_W || 1300;
	var TS_H = _TS_H || 240;
	
	// create random time series
	var xScale = d3.scale.linear().domain([0, TS_M-1]).range([0, TS_W]);
	var yScale = d3.scale.linear().domain([0, 1]).range([TS_H - TS_H/4, TS_H - 3*TS_H/4, ]);	var series = [];
	for (var i=0; i<TS_N; i++) 
	{
		var ts = [];
		for (var j=0; j<TS_M; j++) {
			ts.push({ x: j, y: Math.random() });
		}
		series.push(ts);
	}	
	var pathGen = d3.svg.line()
		.interpolate('linear-closed')
		.x(function(d) { return xScale(d.x); })
		.y(function(d) { return d.dontScaleY ? d.y : yScale(d.y); });	var groups = svg.selectAll('g').data(series).enter().append('g')
		.attr('transform', function(d, i) { return 'translate(20,' + i*(TS_H+60) + ')'; });
	
	// path
	groups.selectAll('path').data(function(d) { 
		var vertices = d.slice(0);
		vertices.splice(0, 0, {x: 0, y: TS_H, dontScaleY: true});
		vertices.push({x: TS_M-1, y: TS_H, dontScaleY: true});
		return [vertices];	}).enter().append('path')
		.attr('d', function(d) { return pathGen(d); })
		.style('stroke-width', '4px')
		.style('stroke', '#80d4ff')
		.style('fill', '#80d4ff')
		.style('fill-opacity', '0.75');
	
	// points
	if (TS_M < 300)
	{
		groups.selectAll('circle').data(function(d) { 
			return d;
		}).enter().append('circle')
			.attr('cx', function(d) { return xScale(d.x); })
			.attr('cy', function(d) { return yScale(d.y); })
			.attr('r', '12px')
			.style('stroke-width', '5px')
			.style('stroke', '#80d4ff')
			.style('fill', 'none')	// lines (axes)
		groups.selectAll('line').data([
			{ x1: 0, y1: TS_H, x2: 0, y2: 0},
			{ x1: 0, y1: TS_H, x2: TS_W, y2: TS_H}
		]).enter().append('line')
			.style('stroke', 'white')
			.style('stroke-width', '6px')
			.style('shape-rendering', 'crispEdges')		.attr('x1', function(d) { return d.x1; })
			.attr('x2', function(d) { return d.x2; })
			.attr('y1', function(d) { return d.y1; })
			.attr('y2', function(d) { return d.y2; });	var ALL_SERIES = series;
	}
	
	svg.on('dblclick', function() 
	{
		var svg = d3.select(this);
		var group = svg.append('g')
			.attr('transform', 'translate(450,700)');
		makeScatterplot(group, series[0], series[1]);
	});	

	function makeScatterplot(svg, _ts1, _ts2)
	{
		var combinedSeries = [];
		for (var i=0, N=_ts1.length; i<N; i++) 
		{
			var v = { x: _ts1[i].y, y: _ts2[i].y };
			combinedSeries.push( v );
		}		// plots
		var SCATTER_W=420;
		var scatterScale = d3.scale.linear().domain([0, 1]).range([15, SCATTER_W-2*15]);
		svg.selectAll('circle').data(combinedSeries).enter().append('circle')
			.attr('cx', function(d) { return scatterScale(d.x); })
			.attr('cy', function(d) { return scatterScale(d.y); })
			.attr('r', '12px')
			.style('stroke-width', '5px')
			.style('stroke', '#80d4ff')
			.style('stroke-opacity', '0.8')
			.style('fill', 'none');
		
		// lines (axes)
		svg.selectAll('line').data([
			{ x1: 0, y1: SCATTER_W, x2: 0, y2: 0},
			{ x1: 0, y1: SCATTER_W, x2: SCATTER_W, y2: SCATTER_W}
		]).enter().append('line')
			.style('stroke', 'white')
			.style('stroke-width', '6px')
			.style('shape-rendering', 'crispEdges')
			.attr('x1', function(d) { return d.x1; })
			.attr('x2', function(d) { return d.x2; })
			.attr('y1', function(d) { return d.y1; })
			.attr('y2', function(d) { return d.y2; });
	}
	return series;
}