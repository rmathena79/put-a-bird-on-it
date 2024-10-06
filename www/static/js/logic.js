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

// These get cleared when starting to download sightings, and updated asynchronously
let sightingMarkers = L.markerClusterGroup();
let totalCount = 0;
let filteredCount = 0;

// Date picker controls, linked together to enforce a date range.
// These are set up after database min/max dates are available
let minPicker = null;
let maxPicker = null;

// Filter dates are saved as Date objects
let filterStartDate = null;
let filterEndDate = null;
let filterNamePrefix = "";
filterNamePrefix = "B"; //!!! Handy during dev

// Strings for the view toggle button
const TOGGLE_BUTTON_GRAPHS = "View Graphs";
const TOGGLE_BUTTON_MAP = "View Map";
//!!!const TOGGLE_BUTTON_DEFAULT = TOGGLE_BUTTON_GRAPHS;
const TOGGLE_BUTTON_DEFAULT = TOGGLE_BUTTON_MAP; //!!! Faster for developing the graph part

const DISPLAY_ON = "block";
const DISPLAY_OFF = "none";

// Used to indicate when the page is downloading data
let loadingSightings = true;
let loadingTrends = true;
let aborting = false;

async function getStaticInfo() {
  console.log("Getting common names");
  await d3.json(`${baseURL}/common_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let cname = response[i].common_name;
      cnames.set(id, cname);
    }
    console.log(`Got ${cnames.size} common names`);
  });  

  console.log("Getting scientific names");
  await d3.json(`${baseURL}/scientific_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let sname = response[i].scientific_name;
      snames.set(id, sname);
    }
    console.log(`Got ${snames.size} scientific names`);
  });

  console.log("Getting key dates");
  await d3.json(`${baseURL}/dates`).then(function (response) {
    min_date = new Date(response.min);
    max_date = new Date(response.max);

    console.log(`Got dates, min:${simpleDateFormat(min_date)}, max:${simpleDateFormat(max_date)}`);
    d3.select("#min-overall-date").text(simpleDateFormat(min_date));
    d3.select("#max-overall-date").text(simpleDateFormat(max_date));

    console.log('Setting up date pickers')
    minPicker = datepicker('#min-date-picker', { id: 1, startDate: min_date });
    maxPicker = datepicker('#max-date-picker', { id: 1, startDate: max_date });

    filterEndDate = max_date;
    filterStartDate = addDays(max_date, -7); // Initially, show a week's worth of data

    // Set the input elements' initial value to match our default search dates.
    //!!! This doesn't actually work.
    d3.select("#min-overall-date").property('value', filterStartDate);
    d3.select("#max-overall-date").property('value', filterEndDate);
  });

  console.log("Getting max count");
  await d3.json(`${baseURL}/count/${simpleDateFormat(min_date)}/${simpleDateFormat(max_date)}`).then(function (response) {
    max_overall_count = response;

    d3.select("#max-overall-count").text(max_overall_count);

    console.log(`Got max overall count: ${max_overall_count}`);
  });
}

function checkControlStates() {
  // There's three main displays: map, graphs, and load screen.
  // The map and graph are toggleable by the user, and the load screen comes and goes programatically
  let shouldShowLoadScreen = loadingSightings || loadingTrends;

  if (shouldShowLoadScreen) {
    d3.select("#load-screen").style("display", DISPLAY_ON);
    d3.select("#map").style("display", DISPLAY_OFF);
    d3.select("#graphs").style("display", DISPLAY_OFF);

    // Disable and grey out the main controls
    d3.select("#filter-controls").style("opacity", "66%");
    d3.select("#min-date-picker").property("disabled", "true");
    d3.select("#max-date-picker").property("disabled", "true");
    d3.select("#name-prefix").property("disabled", "true");
    d3.select("#apply-filters").property("disabled", "true");
    d3.select("#toggle-view").property("disabled", "true");
  }
  else
  {
    d3.select("#load-screen").style("display", DISPLAY_OFF);

    // With the load screen not needed, graph/map view is tied to the toggle button
    let shouldShowGraphs = d3.select("#toggle-view").text() == TOGGLE_BUTTON_MAP;
    if (shouldShowGraphs) {
      d3.select("#map").style("display", DISPLAY_OFF);
      d3.select("#graphs").style("display", DISPLAY_ON);
    }
    else {
      d3.select("#map").style("display", DISPLAY_ON);
      d3.select("#graphs").style("display", DISPLAY_OFF);
    }

    // Enable the main controls
    d3.select("#filter-controls").style("opacity", "100%");
    d3.select("#min-date-picker").attr("disabled", null);
    d3.select("#min-date-picker").attr("disabled", null);
    d3.select("#max-date-picker").attr("disabled", null);
    d3.select("#name-prefix").attr("disabled", null);
    d3.select("#apply-filters").attr("disabled", null);
    d3.select("#toggle-view").attr("disabled", null);
  }
}

function setLoadProgress(percent) {
  console.log(`${percent*100}%`);
  d3.select("#progress-full").style("width", `${percent*100}%`)
  d3.select("#progress-full-pct").text(`Loading: ${Math.floor(percent*100)}%`)
  d3.select("#progress-empty").style("width", `${(1 - percent)*100}%`)
}

function getNextBirds(response) {
  // You'll get a response with length==0 when you run out of results
  if (response.length > 0 && !aborting) {
    totalCount += response.length;
    console.log(`Got ${response.length} sightings; new total ${totalCount}`);
    d3.select("#current-count").text(totalCount);
    setLoadProgress(totalCount / filteredCount);

    for (let i = 0; i < response.length; i++) {
      let r = response[i];
      let cname_id = r.common_name;
      let sname_id = r.scientific_name;
      let lat = r.latitude;
      let lon = r.longitude;
      let cname = cnames.get(cname_id);
      let sname = snames.get(sname_id);
      let date = new Date(r.observation_date);
      let infoLink = `https://animaldiversity.org/accounts/${sname.replace(' ', '_')}/`

      // Add a new marker to the cluster group, and bind a popup.
      let descriptor = `${cname}<BR/><a href="${infoLink}">${sname}</a><BR/>Sighted on ${simpleDateFormat(date)}`;
      sightingMarkers.addLayer(L.marker([lat, lon]).bindPopup(descriptor));
    }

    // Get the next batch
    d3.json(`${getSightingsURL(totalCount)}`).then(getNextBirds);
  }
  else {
    loadingSightings = false;
    aborting = false;
    checkControlStates();

    console.log(`Finished getting sightings; total ${totalCount}`);
  }
}

function getSightingsURL(offset) {
  dates = getFormattedQueryDates();
  result = `${baseURL}/sightings/${offset}/${dates.get('min')}/${dates.get('max')}`

  if (filterNamePrefix != "") {
    result += `/${filterNamePrefix}`;
  }

  return result;
}

async function getAllBirds() {
  console.log('Getting all bird sightings');
  sightingMarkers.clearLayers();
  totalCount = 0;

  // Update displays to describe the current search
  dates = getFormattedQueryDates();
  d3.select("#current-count").text(totalCount);
  d3.select("#min-current-date").text(dates.get('min'));
  d3.select("#max-current-date").text(dates.get('max'));
  d3.select("#current-name-filter").text(filterNamePrefix);

  // Get the count of results for our imminent search. The URL must always include dates,
  // but may or may not include a name:
  countURL = `${baseURL}/count/${dates.get('min')}/${dates.get('max')}`;
  if (filterNamePrefix != "") {
    countURL += `/${filterNamePrefix}`;
  }

  loadingSightings = true;
  setLoadProgress(0);
  checkControlStates();

  await d3.json(countURL).then(function (response) {
    d3.select("#max-current-count").text(response);
    filteredCount = response;
  });

  // The sighting trend graph can populate asynchronously to getting the individual sighting data:
  let graphPromise = drawSightingGraph();

  d3.json(`${getSightingsURL(totalCount)}`).then(getNextBirds);
  await graphPromise;  
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
  return `${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()}`
}

function applyFilters() {
  filterDates = minPicker.getRange()
  console.log(`Apply filter ${filterDates.start} - ${filterDates.end}`)
  filterEndDate = filterDates.end;
  filterStartDate = filterDates.start;
  filterNamePrefix = d3.select("#name-prefix").property("value");
  getAllBirds();
}

async function drawSightingGraph() {
  console.log('Populating sighting trend graphs');

  loadingTrends = true;
  checkControlStates();

  dates = getFormattedQueryDates();
  let baseQueryUrl = `${baseURL}/trend/${dates.get('min')}/${dates.get('max')}`;
  let queryUrl = baseQueryUrl;
  if (filterNamePrefix != "") {
    queryUrl += `/${filterNamePrefix}`;
  }

  d3.json(queryUrl).then(await async function (filteredResponse) {
      let dates = filteredResponse.dates.map(dateString => new Date(dateString));
      
      // Build a line chart based on the raw counts
      let countTrace = {
        x: dates,
        y: filteredResponse.counts,
        type: 'line',
      };
      
      let countData = [countTrace];
      
      let countLayout = {
        title: 'Number of Sightings Reported',
        xaxis: {title: 'Date'},
        yaxis: {
          title: 'Sightings',
          rangemode: 'tozero',
        },
        showlegend: false,
      };

      // Render the raw count chart
      Plotly.newPlot('sighting-trend-graph-count', countData, countLayout, {responsive: true});

      // Build a similar chart based on percent of total -- which requires a new query if the first was filtered by name
      let totalCounts = filteredResponse.counts;
      if (filterNamePrefix != "") {
        // Do the query WITHOUT the name filter to get all sightings per day
        await d3.json(baseQueryUrl).then(function (unfilteredResponse) {
          totalCounts = unfilteredResponse.counts;
        });
      }

      // Calculate the percentages
      let percentages = [];
      for (i=0; i<filteredResponse.counts.length; i++)
      {
        percentages.push(filteredResponse.counts[i] / totalCounts[i]);
      }

      let percentTrace = {
        x: dates,
        y: percentages,
        type: 'line',
      };
      
      let percentData = [percentTrace];
      
      let percentLayout = {
        title: 'Percent of Total Sightings',
        xaxis: {
          title: 'Date',
        },
        yaxis: {
          title: 'Sighting (%)',
          tickformat: ',.2%',
          rangemode: 'tozero',
        },
        showlegend: false,
      };

      Plotly.newPlot('sighting-trend-graph-percent', percentData, percentLayout, {responsive: true});

      loadingTrends = false;
      checkControlStates();
});
}

function toggleView() {
  let buttonElement = d3.select("#toggle-view");
  if (buttonElement.text() == TOGGLE_BUTTON_GRAPHS) {
    // Change to Graph view
    buttonElement.text(TOGGLE_BUTTON_MAP);
  }
  else {
    // Change to  Map view
    buttonElement.text(TOGGLE_BUTTON_GRAPHS);
  }

  checkControlStates();
}

function abortLoad() {
  aborting = true;
}

async function initialize() {
  console.log('Initializing');

  // Adding the tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(myMap);

  // Add our marker cluster layer to the map.
  myMap.addLayer(sightingMarkers);

  // Set up the toggle button
  d3.select("#toggle-view").text(TOGGLE_BUTTON_DEFAULT)

  // Fetching initial data from the API is asnchronous, but the sighting data depends on some other data
  // so there is an order dependency:
  await getStaticInfo();
  await getAllBirds();  
  console.log('Initialization complete');
}

initialize();
