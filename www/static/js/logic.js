// Creating the map object
var myMap = L.map("map", {
  center: [43.8041, -120.5542], // central Oregon
  zoom: 7,
});

// Adding the tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(myMap);

// Store the API query variables.
var baseURL = "http://127.0.0.1:5000/api/v1.0";

// Get the data with d3.
function oldstuff() {
  d3.json(url).then(function (response) {
    // Create a new marker cluster group.
    var markers = L.markerClusterGroup();

    // Loop through the data.
    for (var i = 0; i < response.length; i++) {
      // Set the data location property to a variable.
      var location = response[i].location;

      // Check for the location property.
      if (location) {
        // Add a new marker to the cluster group, and bind a popup.
        markers.addLayer(
          L.marker([
            location.coordinates[1],
            location.coordinates[0],
          ]).bindPopup(response[i].descriptor)
        );
      }
    }

    // Add our marker cluster layer to the map.
    myMap.addLayer(markers);
  });
}

let cnames = new Map();
let snames = new Map();

function getnames() {
  d3.json(`${baseURL}/common_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let cname = response[i].common_name;
      cnames.set(id, cname);
    }
  });

  d3.json(`${baseURL}/scientific_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let sname = response[i].scientific_name;
      snames.set(id, sname);
    }
  });

  console.log(cnames);
  console.log(snames);
}

function getbirds() {
  // Create a new marker cluster group.
  var markers = L.markerClusterGroup();

  d3.json(`${baseURL}/sightings/0`).then(function (response) {
    // You'll get a response with length=0 when you run out of results
    for (let i = 0; i < response.length; i++) {
      let r = response[i];
      let cname_id = r.common_name;
      let sname_id = r.scientific_name;
      let lat = r.latitude;
      let lon = r.longitude;
      let cname = cnames.get(cname_id);
      let sname = snames.get(sname_id);

      // Add a new marker to the cluster group, and bind a popup.
      let descriptor = `${cname} (${sname})`;
      markers.addLayer(
        L.marker([lat, lon]).bindPopup(descriptor));
    }
  });

  // Add our marker cluster layer to the map.
  myMap.addLayer(markers);
}

getnames();
getbirds();
