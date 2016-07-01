function OECDSeries()
{
	this.data = {};
}

OECDSeries.prototype.getDatum = function(key) {
	return this.data[key];
}

OECDSeries.prototype.getCreateDatum = function(key) 
{
	var datum = this.data[key];
	if (!datum) {
		datum = {};
		this.data[key] = datum;
	}
	return datum;
}

OECDSeries.prototype.getTimeseries = function(start, end, varName)
{
	if (!this.timeseries) 
	{
		var timeseries = new Timeseries();
		var s = timeseries.getSeries();
		for (var i=start; i<=end; i++) {
			var datum = this.data[i];
			if (datum) {
				s.push(varName ? datum[varName] : datum);
			}
			else {
				s.push(null);
			}
		}
		return timeseries;
	}
}

function OECDData(url, callback)
{
	this.locations = d3.map();
	this.locationList = [];
	this.completeCallback = callback;

	(function(oecd, url)
	{
		Papa.parse(url, {
			download: true,
			header: true,
			dynamicTyping: true,
			complete: function(results) 
			{
				var startYear = Number.MAX_VALUE;
				var endYear = -Number.MAX_VALUE;

				for (var row=0, R=results.data.length; row<R; row++)
				{
					// we should only have one record
					var record = results.data[row];
					var location = record.LOCATION;
					var year = record.TIME;
					var indicator = record.INDICATOR;
					var value = record.Value;
					var measure = record.MEASURE;

					// only look for records with 'MLN_USD'
					if (measure != 'USD_CAP') {
						// ignore
						continue;
					}

					startYear = Math.min(startYear, year);
					endYear = Math.max(endYear, year);

					// see if we have this location
					var locRecord = oecd.locations.get(location);
					if (!locRecord) 
					{
						// add to list of locations
						oecd.locationList.push(location);

						// make a record
						locRecord = new OECDSeries();
						oecd.locations.set(location, locRecord);
					}

					// get time record for this location
					var timeRecord = locRecord.getCreateDatum(year);
					
					// store a new value
					timeRecord[indicator] = value;
				}

				oecd.startYear = startYear;
				oecd.endYear = endYear;

				if (oecd.completeCallback) {
					oecd.completeCallback(oecd);
				}
			}
		});
	})(this, url);
}

OECDData.prototype.getStartYear = function() {
	return this.startYear;
}

OECDData.prototype.getEndYear = function() {
	return this.endYear;
}

OECDData.prototype.getLocations = function() {
	return this.locationList;
}

OECDData.prototype.getLocation = function(loc) {
	return this.locations.get(loc);
}

OECDData.prototype.getLocationTimeseries = function(loc, varName) {
	var location = this.locations.get(loc);
	var timeseries = location.getTimeseries(this.startYear, this.endYear, varName)
	return timeseries;
}

