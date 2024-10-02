// Store the API query variables.
let baseURL = "http://127.0.0.1:5000/api/v1.0";

// More-or-less unchanging values we get as the page first loads:
let cnames = new Map();
let snames = new Map();
let min_date = null;
let max_date = null;
let max_overall_count = 0;

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

// Date picker controls, linked together to enforce a date range.
// These are set up after database min/max dates are available
let minPicker = null;
let maxPicker = null;

// Filter dates are saved as Date objects
let filterStartDate = null;
let filterEndDate = null;

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

  console.log("Getting key dates");
  d3.json(`${baseURL}/dates`).then(function (response) {
    min_date = new Date(response.min);
    max_date = new Date(response.max);

    d3.select("#min-overall-date").text(simpleDateFormat(min_date));
    d3.select("#max-overall-date").text(simpleDateFormat(max_date));

    console.log(`Got dates, min:${simpleDateFormat(min_date)}, max:${simpleDateFormat(max_date)}`);

    console.log('Setting up date pickers')
    minPicker = datepicker('#min-date-picker', { id: 1, startDate: min_date });
    maxPicker = datepicker('#max-date-picker', { id: 1, startDate: max_date });

    filterEndDate = max_date;
    filterStartDate = addDays(max_date, -2);
  });

  console.log("Getting max count");
  d3.json(`${baseURL}/count/1900-01-01/2345-12-31`).then(function (response) {
    max_overall_count = response;

    d3.select("#max-overall-count").text(max_overall_count);

    console.log(`Got max overall count: ${max_overall_count}`);
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
    d3.select("#current-count").text(totalCount);

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
      let descriptor = `${cname} (${sname})<BR>Sighted on ${simpleDateFormat(date)}`;
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
  await sleep(3000);
  markers = L.markerClusterGroup();
  totalCount = 0;

  dates = getFormattedQueryDates();
  d3.select("#current-count").text(totalCount);
  d3.select("#min-current-date").text(dates.get('min'));
  d3.select("#max-current-date").text(dates.get('max'));

  d3.json(`${baseURL}/count/${dates.get('min')}/${dates.get('max')}`).then(function (response) {
    d3.select("#max-current-count").text(response);
  });

  d3.json(`${getSightingsURL(totalCount)}`).then(getNextBirds);  

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
  result.set('min', `${simpleDateFormat(filterStartDate)}`);
  result.set('max', `${simpleDateFormat(filterEndDate)}`);
  return result;
}

function simpleDateFormat(date) {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
}

function applyFilters() {
  filterDates = minPicker.getRange()
  console.log(`Apply filter ${filterDates.start} - ${filterDates.end}`)
  filterEndDate = filterDates.end;
  filterStartDate = filterDates.start;
  getAllBirds();
}

getStaticInfo();
getAllBirds();