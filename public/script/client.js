'use strict';
(function(exports) {
var socket;
$(document).ready(function(){

  // https://plotly.com/
  // mousewheel or two-finger scroll zooms the plot

  // var trace1 = {
  //   x:['2020-10-04', '2021-11-04', '2023-12-04'],
  //   y: [90, 40, 60],
  //   type: 'scatter'
  // };
  var x1 = [],y1 = [], i, L=1000;
  for (i=0; i<L; i++) {
    x1.push(10*2*Math.PI/L*i);
    y1.push(x1[i] * Math.sin(x1[i]));
  }
  var trace1 = {
      x:x1, y: y1,
      type: 'scatter'
    };
  var data = [trace1];

  var layout = {
    title: 'Plotly test',
    showlegend: false
  };

  Plotly.newPlot('plotlytest', data, layout, {scrollZoom: true, responsive: true});

  socket = io.connect();
  socket.on('weather_res', function (data) {
    //console.log(data.weatherData);
    if (data.weatherData.current) {
      //$('#dt').html( new Date().toLocaleTimeString('de-DE') );
      
      $('#dt').html( new Date(data.weatherData.current.dt*1000).toLocaleTimeString('de-DE') + ' Uhr');
      $('#temp').html(data.weatherData.current.temp + ' °C');
      $('#wind_speed').html(
        sprintf('%3.2f %s', data.weatherData.current.wind_speed * 3.6, ' km/h') ); // m/s -> km/h
      $('#sunrise').html(new Date(data.weatherData.current.sunrise*1000).toLocaleTimeString('de-DE') + ' Uhr' );
      $('#sunset').html(new Date(data.weatherData.current.sunset*1000).toLocaleTimeString('de-DE') + ' Uhr' );
      $('#pressure').html(data.weatherData.current.pressure + ' hPa');
      $('#humidity').html(data.weatherData.current.humidity + ' %');
      $('#dew_point').html(data.weatherData.current.dew_point + ' °C');
      $('#wind_deg').html(data.weatherData.current.wind_deg + ' °');
      $('#clouds').html(data.weatherData.current.clouds + ' %');
    }
    if (data.weatherData.forecasthourly) {
      var table = $('#tbl_weather_hourly')[0];
      var row, rainSnow=0, timestamp;
      for (var i = 0; i < data.weatherData.forecasthourly.length; i++) {
        row = table.rows[i];
        // dt
        timestamp = new Date(data.weatherData.forecasthourly[i].dt*1000);
        row.cells[0].innerHTML = mu.weekDay2ShortString(timestamp.getDay()) + ' '
          + (timestamp.getDate()).toString() + '.' 
          +(timestamp.getMonth()+1).toString() + '. ' 
          + timestamp.getHours() + ' Uhr';
        // img
        row.cells[1].innerHTML ='<img src="http://openweathermap.org/img/wn/'+
        data.weatherData.forecasthourly[i].weather[0].icon + '@2x.png" style="width:75px;">';
        // temp
        row.cells[2].innerHTML = data.weatherData.forecasthourly[i].temp + ' °C';
        rainSnow=0;
        if (data.weatherData.forecasthourly[i].rain) {
          rainSnow += parseFloat( data.weatherData.forecasthourly[i].rain['1h'] );
        }
        if (data.weatherData.forecasthourly[i].snow) {
          rainSnow += parseFloat( data.weatherData.forecasthourly[i].snow['1h'] );
        }
        // rain+snow
        row.cells[3].innerHTML = rainSnow + ' l/qm';
        // windspeed
        row.cells[4].innerHTML = 
        sprintf('%3.2f %s', parseFloat(data.weatherData.forecasthourly[i].wind_speed * 3.6), ' km/h'); // m/s -> km/h
      }
    }
    if (data.weatherData.forecastdaily) {
      var table = $('#tbl_weather_daily')[0];
      var row, rainSnow=0;
      for (var i = 0; i < data.weatherData.forecastdaily.length; i++) {
        row = table.rows[i+1];
        // dt
        timestamp = new Date(data.weatherData.forecastdaily[i].dt*1000);
        row.cells[0].innerHTML = mu.weekDay2ShortString(timestamp.getDay()) + ' '
          + (timestamp.getDate()).toString() + '.' 
          +(timestamp.getMonth()+1).toString() + '.';
        // img
        row.cells[1].innerHTML ='<img src="http://openweathermap.org/img/wn/'+
        data.weatherData.forecastdaily[i].weather[0].icon + '@2x.png" style="width:75px;">';
        
        rainSnow=0;
        if (data.weatherData.forecastdaily[i].rain) {
          rainSnow += parseFloat( data.weatherData.forecastdaily[i].rain );
        }
        if (data.weatherData.forecastdaily[i].snow) {
          rainSnow += parseFloat( data.weatherData.forecastdaily[i].snow );
        }
        // rain+snow
        row.cells[2].innerHTML = rainSnow + ' l/qm';

        // temp morning
        row.cells[3].innerHTML = data.weatherData.forecastdaily[i].temp.morn + ' °C';
        // temp day
        row.cells[4].innerHTML = data.weatherData.forecastdaily[i].temp.day + ' °C';
        // temp evening
        row.cells[5].innerHTML = data.weatherData.forecastdaily[i].temp.eve + ' °C';
        // temp night
        row.cells[6].innerHTML = data.weatherData.forecastdaily[i].temp.night + ' °C';
      }
    }

  });

  weatherClick();
  var intervalId = setInterval(function () {
    weatherClick();
  }, 10000);

});
  function weatherClick (id, state) {
    socket.emit('weather_req');
  };
  exports.client = {
    weatherClick : weatherClick
  }
})(this);
