function CarbonData(url, callback)
{
	this.timeseries = new Timeseries;
	(function(url, carbon, callback) 
	{
		Papa.parse(url, {
			delimiter: ' ',
			header: true,
			download: true,
			dynamicTyping: true,

			complete: function(results) 
			{
				var series = carbon.timeseries.getSeries();
				for (var row=0, R=results.data.length; row<R; row++)
				{
					var record = results.data[row];
					if (row == 0) {
						carbon.startTime = new Date(record.year + "-" + record.month + "-" + record.day);
					}
					else if (row == R-1)
					{
						carbon.endTime = new Date(record.year + "-" + record.month + "-" + record.day);
					}
					
					var reading = record.value;
					if (reading > 0) 
					{
						series.push(reading);
					}
					else
					{
						series.push(null);
					}
				}
				carbon.timeseries.smooth(60);
				callback(carbon);

			}
		});

	})(url, this, callback);
}

CarbonData.prototype.getTimeseries = function()
{
	return this.timeseries;
}

CarbonData.prototype.getStartTime = function() {
	return this.startTime;
}

CarbonData.prototype.getEndTime = function() {
	return this.endTime;
}
