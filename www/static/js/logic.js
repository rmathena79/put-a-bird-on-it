// Creating the map object
let myMap = L.map("map", {
  center: [43.8041, -120.5542], // central Oregon
  zoom: 7,
});

// Adding the tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(myMap);

// Store the API query variables.
let baseURL = "http://127.0.0.1:5000/api/v1.0";

let cnames = new Map();
let snames = new Map();

function getAllNames() {
  console.log("Getting common names");
  d3.json(`${baseURL}/common_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let cname = response[i].common_name;
      cnames.set(id, cname);
    }
    console.log(`Got ${cnames.size} common names`);
  });  

  console.log("Getting scientific names");
  d3.json(`${baseURL}/scientific_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let sname = response[i].scientific_name;
      snames.set(id, sname);
    }
    console.log(`Got ${snames.size} scientific names`);
  });  
}

// These get reset when starting to download sightings, and updated asynchronously
let markers = null;
let totalCount = 0;

function getNextBirds(response) {
  // You'll get a response with length==0 when you run out of results
  if (response.length > 0) {
    totalCount += response.length;
    console.log(`Got ${response.length} sightings; new total ${totalCount}`);
    for (let i = 0; i < response.length; i++) {
      let r = response[i];
      let cname_id = r.common_name;
      let sname_id = r.scientific_name;
      let lat = r.latitude;
      let lon = r.longitude;
      let cname = cnames.get(cname_id);
      let sname = snames.get(sname_id);
      let date = r.observation_date;

      // Add a new marker to the cluster group, and bind a popup.
      let descriptor = `${cname} (${sname})<BR>Sighted on ${date.toDateString()}`;
      markers.addLayer(L.marker([lat, lon]).bindPopup(descriptor));
    }

    // Get the next batch
    d3.json(`${baseURL}/sightings/${totalCount}`).then(getNextBirds);
  }
  else {
    console.log(`Finished getting sightings; total ${totalCount}`);
  }
}

function getAllBirds() {
  markers = L.markerClusterGroup();
  totalCount = 0; // Is there markers.length?
  d3.json(`${baseURL}/sightings/${totalCount}`).then(getNextBirds);

  // Add our marker cluster layer to the map.
  myMap.addLayer(markers);
}

getAllNames();
getAllBirds();
