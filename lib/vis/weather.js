function WeatherData(urls, callback, startTime, endTime)
{
	this.urls = urls;
	this.currentURL = 0;
	this.completeCallback = callback;
	this.startTime = startTime;
	this.endTime = endTime;
	this.stationNames = {};
	this.stations = [];
	this.parse(this.urls[this.currentURL]);
}

WeatherData.prototype.parse = function(url)
{
	var dataURL = (typeof url == 'string' ? url : url.url);
	var stationName = (typeof url == 'string' ? null : url.name);

	var station = {
		timeseries: new Timeseries(),
		startTime: null,
		endTime: null
	};

	(function(dataURL, station, weatherData)
	{
		Papa.parse(dataURL, {
			delimiter: ',',
			header: true,
			download: true,
			dynamicTyping: true,

			complete: function(results) 
			{
				var series = station.timeseries.getSeries();
				var data = results.data;
				for (var row=0, R=data.length; row<R; row++)
				{
					var record = data[row];
					var year = record.Year;
					var month = record.Month;
					var reading = record.Anomaly;

					if (row == 0) {
						station.startTime = new Date(year + "-" + month + "-1");
					}
					else if (row == R-1)
					{
						station.endTime = new Date(year + "-" + month + "-1");
					}
					
					// insert reading
					if (!isNaN(reading)) 
					{
						series.push(reading);
					}
					else
					{
						series.push(null);
					}
				}
				weatherData.parseComplete();
			}
		});
	})(dataURL, station, this);

	// add station
	this.stations.push(station);

	// add station name, if we have it
	if (stationName) {
		station.name = stationName;
		this.stationNames[stationName] = station;
	}
}

WeatherData.prototype.getStation = function(index) 
{
	if (typeof index == 'string') {
		return this.stationNames[index];
	}
	else
	{
		return this.stations[index];
	}
}
WeatherData.prototype.getStartTime = function() {
	return this.startTime;
}
WeatherData.prototype.getEndTime = function() {
	return this.endTime;
}
WeatherData.prototype.getDates = function() {
	return [this.startTime, this.endTime];
}

WeatherData.prototype.unifyStationTime = function() 
{
	this.timeseries = [];
	if (!this.startTime || !this.endTime)
	{
		// loop through all stations and calculate maximum span
		var startTime = Number.MAX_VALUE;
		var endTime = -Number.MAX_VALUE;
		
		for (var i=0, N=this.stations.length; i<N; i++) {
			var station = this.stations[i];
			var sTime = station.startTime.getTime();
			var eTime = station.endTime.getTime();

			if (startTime > sTime) {
				startTime = sTime;
			}
			if (endTime < eTime) {
				endTime = eTime;
			}
		}

		if (!this.startTime) {
			this.startTime = new Date(startTime);
		}
		if (!this.endTime) {
			this.endTime = new Date(endTime);
		}
	}

	// loop through all stations again
	for (var i=0, N=this.stations.length; i<N; i++) 
	{
		var year = this.startTime.getYear();
		var month = this.startTime.getMonth();

		var endYear = this.endTime.getYear();
		var endMonth = this.endTime.getMonth();

		var station = this.stations[i];
		var stationStart = station.startTime;
		var stationEnd = station.endTime;

		station.unifiedTimeseries = new Timeseries();
		var newSeries = station.unifiedTimeseries.getSeries();
		var oldSeries = station.timeseries.getSeries(); 

		while (true) {
			if (stationStart.getYear() < year || (stationStart.getYear() == year && stationStart.getMonth() <= month))
			{
				if (stationEnd.getYear() > year || (stationEnd.getYear() == year && stationEnd.getMonth() >= month)) {
					// read value
					var dYear = year - stationStart.getYear();
					var dMonth = month - stationStart.getMonth();
					newSeries.push( oldSeries[dYear*12 + dMonth] );
				}
			}
			else {
				newSeries.push( null );
			}

			// advance
			month++;
			if (month > 11) {
				year++;
				month = 0;
			}
			if ((year > endYear) || (year == endYear && month > endMonth)) {
				// done
				break;
			}
		}

		this.timeseries.push(station.unifiedTimeseries);
	}
}

WeatherData.prototype.getExtents = function() {
	var extents = [Number.MAX_VALUE, -Number.MAX_VALUE];
	for (var i=0, N=this.timeseries.length; i<N; i++) {
		var e = this.timeseries[i].getExtents();
		extents[0] = Math.min(extents[0], e[0]);
		extents[1] = Math.max(extents[1], e[1]);
	}
	return extents;
}

WeatherData.prototype.parseComplete = function() {
	this.currentURL++;
	if (this.currentURL >= this.urls.length) 
	{
		// we're done
		this.unifyStationTime();
		if (this.completeCallback) 
		{
			this.completeCallback(this, this.timeseries);
		}
	}
	else
	{
		// read more
		this.parse(this.urls[this.currentURL]);
	}
}