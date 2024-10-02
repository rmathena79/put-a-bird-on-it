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
let min_date = null;
let max_date = null;

function getStaticInfo() {
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

  console.log("Getting key dates...");
  d3.json(`${baseURL}/dates`).then(function (response) {
    min_date = new Date(response.min);
    max_date = new Date(response.max);
    console.log(`Got dates, min:${min_date.toUTCString()}, max:${max_date.toUTCString()}`);
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
      let date = new Date(r.observation_date);

      // Add a new marker to the cluster group, and bind a popup.
      let descriptor = `${cname} (${sname})<BR>Sighted on ${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
      markers.addLayer(L.marker([lat, lon]).bindPopup(descriptor));
    }

    // Get the next batch
    d3.json(`${getSightingsURL(totalCount)}`).then(getNextBirds);
  }
  else {
    console.log(`Finished getting sightings; total ${totalCount}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSightingsURL(offset) {
  dates = getFormattedQueryDates();
  return `${baseURL}/sightings/${offset}/${dates.get('min')}/${dates.get('max')}`
}

async function getAllBirds() {
  await sleep(1000);
  markers = L.markerClusterGroup();
  totalCount = 0;
  d3.json(`${getSightingsURL(totalCount)}`).then(getNextBirds);
  console.log(getFormattedQueryDates());

  // Add our marker cluster layer to the map.
  myMap.addLayer(markers);
}

// https://stackoverflow.com/questions/563406/how-to-add-days-to-date
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getFormattedQueryDates() {
  result = new Map();
  let min = addDays(max_date, -7);
  result.set('min', `${min.getUTCFullYear()}-${min.getUTCMonth()}-${min.getUTCDate()}`);
  result.set('max', `${max_date.getUTCFullYear()}-${max_date.getUTCMonth()}-${max_date.getUTCDate()}`);
  console.log(`min: ${min}, max: ${max_date}`);
  return result;
}

getStaticInfo();
getAllBirds();

