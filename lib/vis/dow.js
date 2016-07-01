function DowData(url, callback)
{
	this.timeseries = new Timeseries;
	(function(url, dow, callback) 
	{
		Papa.parse(url, {
			header: true,
			download: true,
			dynamicTyping: true,

			complete: function(results) 
			{
				var series = dow.timeseries.getSeries();
				for (var row=0, R=results.data.length; row<R; row++)
				{
					var record = results.data[row];
					if (row == 0) {
						dow.startTime = new Date(record.DATE);
					}
					else if (row == R-1)
					{
						dow.endTime = new Date(record.DATE);
					}
					
					var reading = record.VALUE;
					if (!isNaN(reading) && reading > 0) 
					{
						series.push(reading);
					}
					else
					{
						series.push(null);
					}
				}
				//dow.timeseries.smooth(90);
				callback(dow);
			}
		});

	})(url, this, callback);
}

DowData.prototype.getTimeseries = function()
{
	return this.timeseries;
}

DowData.prototype.getStartTime = function() {
	return this.startTime;
}

DowData.prototype.getEndTime = function() {
	return this.endTime;
}