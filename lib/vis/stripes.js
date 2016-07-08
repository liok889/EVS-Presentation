STRIPE_COLOR_SCALE0 = ['rgb(251, 245, 190)', 'rgb(255,225,171)', 'rgb(255, 201, 147)', 'rgb(255, 175, 126)', 'rgb(255,146,109)', 'rgb(250, 113, 97)',
								'rgb(238,92,99)', 'rgb(214, 74, 109)', 'rgb(189, 65,119)', 'rgb(161,56,125)', 'rgb(135, 50, 127)', 'rgb(109, 41, 126)',
								'rgb(83,36,122)', 'rgb(52,28,104)', 'rgb(30, 23, 73)', 'rgb(10,10,36)', 'rgb(0,0,0)']
STRIPE_COLOR_SCALE1 = ['rgb(255,245,235)','rgb(254,230,206)','rgb(253,208,162)','rgb(253,174,107)','rgb(253,141,60)','rgb(241,105,19)','rgb(217,72,1)','rgb(166,54,3)','rgb(127,39,4)'];
STRIPE_COLOR_SCALE2 = ['rgb(255,255,204)','rgb(255,237,160)','rgb(254,217,118)','rgb(254,178,76)','rgb(253,141,60)','rgb(252,78,42)','rgb(227,26,28)','rgb(189,0,38)','rgb(128,0,38)'];
STRIPE_COLOR_SCALE3 = ['rgb(255,255,217)','rgb(237,248,177)','rgb(199,233,180)','rgb(127,205,187)','rgb(65,182,196)','rgb(29,145,192)','rgb(34,94,168)','rgb(37,52,148)','rgb(8,29,88)'];
STRIPE_COLOR_SCALE4 = ['rgb(255,255,255)','rgb(240,240,240)','rgb(217,217,217)','rgb(189,189,189)','rgb(150,150,150)','rgb(115,115,115)','rgb(82,82,82)','rgb(37,37,37)','rgb(0,0,0)'];
STRIPE_COLOR_SCALE5 = ['rgb(178,24,43)','rgb(214,96,77)','rgb(244,165,130)','rgb(253,219,199)','rgb(247,247,247)','rgb(209,229,240)','rgb(146,197,222)','rgb(67,147,195)','rgb(33,102,172)'].reverse();
STRIPE_COLOR_SCALE6 = ['rgb(255,0,255)','rgb(255,0,0)', 'rgb(255,255,0)','rgb(0,255,0)','rgb(0,255,255)','rgb(0,0,255)'].reverse();

function StripesPlot(canvas, w, h, timeseries, colorScale)
{
	this.w = w;
	this.h = h;
	this.canvas = canvas;
	this.timeseries = timeseries;

	// draw the time series
	var N = this.timeseries.size();
	var series = this.timeseries.getSeries();
	var extents = this.timeseries.getExtents();
	
	var stripeWidth = this.w / N;
	var stripeHeight = this.h;
	var context = this.canvas.node().getContext('2d');

	// make color scale
	if (!colorScale) {
		colorScale = STRIPE_COLOR_SCALE2;
	}

	var nScale = d3.scale.linear().domain([extents[0], extents[1]]).range([0, 1]);
	var _colorScale = d3.scale.quantize().domain([extents[0], extents[1]]).range(d3.range(colorScale.length));
	
	// clear canvas background
	context.clearRect(0, 0, this.w, this.h);

	// draw stripes
	
	for (var i=0; i<N; i++) 
	{
		var val = series[i];
		if (val !== null)
		{
			var c = d3.rgb(interpolateColorScale(nScale(val), colorScale));

			context.beginPath();
			context.rect(i * stripeWidth, 0, stripeWidth, stripeHeight);
			context.fillStyle = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ', 1.0)';
			context.fill();
		}
	}
	
}

function interpolateColorScale(alpha, colorScale)
{
	var step = 1.0 / (colorScale.length-1);
	var curStep = 0.0, i=0;
	for (i=0; i<colorScale.length-1; i++, curStep += step)
	{
		if (curStep <= alpha && curStep+step >= alpha) {
			break;
		}
	}

	var c1 = d3.rgb(colorScale[i]);
	var c2 = d3.rgb(colorScale[i+1]);
	var a = Math.max(0, Math.min(1, (alpha-curStep) / step));

	var interpolator = d3.interpolate(c1, c2);
	var theColor = interpolator(a);
	
	return theColor;
}
