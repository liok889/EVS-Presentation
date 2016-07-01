
function HorizonPlot(svg, w, h, timeseries, levels)
{
	
	this.w = w;
	this.h = h;

	this.levels = levels;
	this.group = svg.append('g');

	var extents = series.getExtents();
	var extentLen = extents[1]-extents[0];

	var series = timeseries.getSeries();
	var chunks = [];
	var curChunk = {};

	for (var i=0, N=series.length; i<N; i++) 
	{
		var val = series[i];
		if (val === null || val === undefined) {
			continue;
		}

		var level = Math.min(levels-1, Math.floor((val-extents[0]) / (extentLen / levels)));
		var yScale = d3.scale.linear()
			.domain([0, extentLen / levels])
			.range([this.h, 0])

		if (curChunk == null) {
			curChunk = {
				level: level,
				vertices: [
					// add a grounding vertex
					{ x: i, y: 0 }
				]
			};
		}

		if (curChunk.level == level)
		{
			// add vertex
			curChunk.vertices.push({x: i, y: val - level * extentLen / levels });
		}
		else
		{
			// add another grounding vertex
			curChunk.vertices.push({x: i, y: 0});
			chunks.push(curChunk);
			curChunk = null;
			
			// repeat this point after we've gotten rid of the last chunk
			i--;
			continue;
		}
	}

	if (curChunk) {
		// ground
		curChunk.vertices.push({x: i, y: 0});
		chunks.push(curChunk);
	}
}
