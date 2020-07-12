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
      $('#wind_speed').html(data.weatherData.current.wind_speed * 3.6 + ' km/h'); // m/s -> km/h
      $('#sunrise').html(new Date(data.weatherData.current.sunrise*1000).toLocaleTimeString('de-DE') + ' Uhr' );
      $('#sunset').html(new Date(data.weatherData.current.sunset*1000).toLocaleTimeString('de-DE') + ' Uhr' );
      $('#pressure').html(data.weatherData.current.pressure + ' hPa');
      $('#humidity').html(data.weatherData.current.humidity + ' %');
      $('#dew_point').html(data.weatherData.current.dew_point + ' °C');
      $('#wind_deg').html(data.weatherData.current.wind_deg + ' °');
      $('#clouds').html(data.weatherData.current.clouds + ' %');
    }

  });


  // intervalId = setInterval(function () {
  //   updateWeather();
  // }, 1000);

});
  function weatherClick (id, state) {
    socket.emit('weather_req');
  };
  exports.client = {
    weatherClick : weatherClick
  }
})(this);
