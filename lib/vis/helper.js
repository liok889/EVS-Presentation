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