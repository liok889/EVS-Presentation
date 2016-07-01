/* =================================
 * A multidimensional timeseries
 * =================================*/
 
function Timeseries(N)
{
	this.series = [];
	if (N !== undefined && N !== null && !isNaN(N)) {
		this.series.length = N;
	}
}

Timeseries.prototype.clone = function()
{
	var ts = new Timeseries();
	ts.series = this.series.slice(0);
	ts.extents = this.extents ? [this.extents[0], this.extents[1]] : this.extents;
	ts.originalExtents = this.originalExtents ? [this.originalExtents[0], this.originalExtents[1]] : this.originalExtents;
	return ts;
}

Timeseries.prototype.size = function()
{
	return this.series.length;
}

Timeseries.prototype.addReading = function(data)
{
	this.series.push(data);
}

Timeseries.prototype.concat = function(otherSeries, varName)
{
	for (var i=0, N=otherSeries.series.length; i<N; i++) 
	{
		var reading = otherSeries.series[i];
		if (reading === null) {
			this.series.push(null);
		}
		else
		{
			var v = varName ? reading[varName] : reading;
			if (varName && isNaN(v))
			{
				this.series.push(null);
			}
			else
			{
				this.series.push( v );
				if (!isNaN(v))
				{
					if (!this.extents) {
						this.extents = [v, v];
						this.originalExtents = [v, v];
					}
					else
					{
						this.extents[0] = Math.min(this.extents[0], v);
						this.extents[1] = Math.max(this.extents[1], v);
						this.originalExtents[0] = this.extents[0];
						this.originalExtents[1] = this.extents[1];
					}
				}
			}
		}
	}
}

Timeseries.prototype.getExtents = function()
{
	if (!this.extents)
	{
		var minV = Number.MAX_VALUE, maxV = -Number.MAX_VALUE;
		for (var i=0, N=this.series.length; i<N; i++) {
			var v = this.series[i];
			if (v !== null) {
				if (v < minV) { minV = v; }
				if (v > maxV) { maxV = v; }
			}
		}
		this.extents = [minV, maxV];
		this.originalExtents = [minV, maxV];
	}
	return this.extents;
}

Timeseries.prototype.getOriginalExtents = function()
{
	if (!this.originalExtents) {
		this.getExtents();
	}
	return this.originalExtents;
}

Timeseries.prototype.normalize = function() 
{
	var extents = this.getExtents();
	var span = extents[1]-extents[0];
	for (var i=0, N=this.series.length; i<N; i++) 
	{
		var v = this.series[i];
		if (v !== null) {
			this.series[i] = (this.series[i] - extents[0]) / span;
		}
	}
	this.extents = [0,1];
	return this;
}

Timeseries.prototype.getSeries = function()
{
	return this.series;
}

Timeseries.prototype.zero = function()
{
	for (var i=0, N=this.series.length; i<N; i++) {
		this.series[i] = 0;
	}
	this.extents = [0,0];
	return this;
}

Timeseries.prototype.cosineWave = function(amplitude, waveLength, phase)
{
	for (var i=0, N=this.series.length; i<N; i++) {
		this.series[i] += amplitude * Math.cos( 2*Math.PI * ((i+phase)/waveLength)  );
	}
	this.extents = undefined;
	return this;
}

Timeseries.prototype.noise = function(range)
{
	var rangeLen = range[1] - range[0]
	for (var i=0, N=this.series.length; i<N; i++) {
		this.series[i] += rangeLen * Math.random() + range[0];
	}
	this.extents = undefined;
	return this;
}

Timeseries.prototype.smooth = function(windowSize, nullifyBoundaries)
{
	// window size must be odd
	if (windowSize % 2 == 0) { windowSize++; }

	// make sure the size of the series is longer than the proposed smoothing window
	if (this.series.length < windowSize) {
		return;
	}

	var series = this.series, smoothed = [];
	var e = [Number.MAX_VALUE, -Number.MAX_VALUE];	// new extents
	var halfWindowSize = Math.floor(windowSize / 2);

	// calculate initial window
	var winSum = 0, winCount = 0;
	for (var i=0; i<windowSize; i++) 
	{
		val = series[i]
		winSum +=	(val !== null ? val : 0);
		winCount +=	(val !== null ? 1 : 0);

		if (i < halfWindowSize) 
		{
			if (nullifyBoundaries) val = null;
			smoothed.push(val);
			if (val !== null) {
				// keep track of min/max
				if (val < e[0]) e[0] = val;
				if (val > e[1]) e[1] = val;	
			}
		}
	}

	for (var i=halfWindowSize, N=series.length-halfWindowSize; i<N; i++) 
	{
		if (winCount == 0) 
		{
			smoothed.push(null);
		}
		else
		{
			var smoothedVal = winSum / winCount;
			smoothed.push(winSum / winCount);

			// keep track of min/max
			if (smoothedVal < e[0]) e[0] = smoothedVal;
			if (smoothedVal > e[1]) e[1] = smoothedVal;

		}

		// update running window
		var outVal = series[i-halfWindowSize];
		var inVal = series[i+halfWindowSize+1];
		
		// subtract value out of window
		winSum -= outVal !== null ? outVal : 0;
		winCount -= outVal !== null ? 1 : 0;
		
		// add value that's going to be in window
		winSum += inVal !== null ? inVal : 0;
		winCount += inVal !== null ? 1 : 0;
	}
	
	// add remaining windows
	for (var i=series.length-halfWindowSize, N=series.length; i<N; i++) 
	{
		var val = series[i];
		if (nullifyBoundaries) val = null;
		smoothed.push(val);

		if (val !== null) {
			// keep track of min/max
			if (val < e[0]) e[0] = val;
			if (val > e[1]) e[1] = val;			
		}
	}

	this.series = smoothed;
	this.extents = e;
	return this;
}


