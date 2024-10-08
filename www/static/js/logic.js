// Store the API query variables.
let baseURL = "http://127.0.0.1:5000/api/v1.0";

// More-or-less unchanging values we get as the page first loads:
let cnamesByID = new Map();
let snamesByID = new Map();
let genusSpeciesMap = new Map();
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
let filterGenus = "";
let filterSpecies = "";

// Strings for the view toggle button
const TOGGLE_BUTTON_GRAPHS = "Statistics";
const TOGGLE_BUTTON_MAP = "Map";
const TOGGLE_BUTTON_DEFAULT = TOGGLE_BUTTON_GRAPHS;

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
      cnamesByID.set(id, cname);
    }
    console.log(`Got ${cnamesByID.size} common names`);
  });

  console.log("Getting scientific names");
  await d3.json(`${baseURL}/scientific_names`).then(function (response) {
    for (let i = 0; i < response.length; i++) {
      let id = response[i].id;
      let sname = response[i].scientific_name;
      snamesByID.set(id, sname);

      // Build up the map of genus names to full scientific names
      genus = sname.split(" ")[0];
      if (genusSpeciesMap.has(genus)) {
        // Add this species under the genus
        genusSpeciesMap.get(genus).push(sname);

        // Keep it sorted (re-doing this isn't very efficient but it should be OK for our purposes)
        genusSpeciesMap.get(genus).sort();
      } else {
        // Create a new list of names under this genus
        genusSpeciesMap.set(genus, [sname]);
      }
    }

    console.log(`Got ${snamesByID.size} scientific names`);

    // Populate options for the genus selector, sorted alphabetically
    // (Note the species selection is more dynamic, depending on the genus selected)
    console.log("Setting up genus filter control");
    console.log(genusSpeciesMap);

    let selector = d3.select("#genus-picker");
    let genuses = Array.from(genusSpeciesMap.keys()).sort();
    selector.append("option").text("").property("value", "");
    genuses.forEach((genus) => {
      selector.append("option").text(genus).property("value", genus);
    });
  });

  console.log("Getting key dates");
  await d3.json(`${baseURL}/dates`).then(function (response) {
    // Going from string to date to string to date is an unsavory way to handle time zone issues
    min_date = new Date(simpleDateFormat(new Date(response.min)));
    max_date = new Date(simpleDateFormat(new Date(response.max)));

    console.log(
      `Got dates, min:${simpleDateFormat(min_date)}, max:${simpleDateFormat(max_date)}`);
    console.log(`Got dates, min:${min_date}, max:${max_date}`);

    d3.select("#min-overall-date").text(simpleDateFormat(min_date));
    d3.select("#max-overall-date").text(simpleDateFormat(max_date));

    // Initially, show a week's worth of data
    filterEndDate = max_date;
    filterStartDate = addDays(max_date, -7);

    console.log("Setting up date pickers");
    minPicker = datepicker("#min-date-picker", {
      id: 1,
      minDate: min_date,
      maxDate: max_date,
      dateSelected: filterStartDate,
      onSelect: (instance, date) => {
        // Don't clear the selected date
        if (date === undefined) {
          instance.setDate(filterStartDate);
          instance.hide();
        }
      },
    });
    maxPicker = datepicker("#max-date-picker", {
      id: 1,
      minDate: min_date,
      maxDate: max_date,
      dateSelected: filterEndDate,
      onSelect: (instance, date) => {
        // Don't clear the selected date
        if (date === undefined) {
          instance.setDate(filterEndDate);
          instance.hide();
        }
      },
    });
  });

  console.log("Getting overall max count");
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
    d3.select("#genus-picker").property("disabled", "true");
    d3.select("#species-picker").property("disabled", "true");
    d3.select("#apply-filters").property("disabled", "true");
    d3.select("#toggle-view").property("disabled", "true");
  } else {
    d3.select("#load-screen").style("display", DISPLAY_OFF);

    // With the load screen not needed, graph/map view is tied to the toggle button
    let shouldShowGraphs =
      d3.select("#toggle-view").text() == TOGGLE_BUTTON_MAP;
    if (shouldShowGraphs) {
      d3.select("#map").style("display", DISPLAY_OFF);
      d3.select("#graphs").style("display", DISPLAY_ON);
    } else {
      d3.select("#map").style("display", DISPLAY_ON);
      d3.select("#graphs").style("display", DISPLAY_OFF);
    }

    // Enable the main controls
    d3.select("#filter-controls").style("opacity", "100%");
    d3.select("#min-date-picker").attr("disabled", null);
    d3.select("#min-date-picker").attr("disabled", null);
    d3.select("#max-date-picker").attr("disabled", null);
    d3.select("#genus-picker").attr("disabled", null);
    d3.select("#species-picker").attr("disabled", null);
    d3.select("#apply-filters").attr("disabled", null);
    d3.select("#toggle-view").attr("disabled", null);
  }
}

function setLoadProgress(percent) {
  console.log(`${percent * 100}%`);
  d3.select("#progress-full").style("width", `${percent * 100}%`);
  d3.select("#progress-full-pct").text(
    `Loading: ${Math.floor(percent * 100)}%`
  );
  d3.select("#progress-empty").style("width", `${(1 - percent) * 100}%`);
}

function getInfoLink(scientificName) {
  return `https://animaldiversity.org/accounts/${scientificName.replace(" ","_")}/`;
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
      let cname = cnamesByID.get(cname_id);
      let sname = snamesByID.get(sname_id);
      let date = new Date(r.observation_date);
      let infoLink = getInfoLink(sname);

      // Add a new marker to the cluster group, and bind a popup.
      let descriptor = `${cname}<BR/><a href="${infoLink}">${sname}</a><BR/>Sighted on ${simpleDateFormat(date)}`;
      sightingMarkers.addLayer(L.marker([lat, lon]).bindPopup(descriptor));
    }

    // Get the next batch
    d3.json(`${getSightingsURL(totalCount)}`).then(getNextBirds);
  } else {
    loadingSightings = false;
    aborting = false;
    checkControlStates();

    console.log(`Finished getting sightings; total ${totalCount}`);
  }
}

function getFullNameFilter() {
  if (filterSpecies != "") {
    // The species is a full name itself
    return filterSpecies;
  } else if (filterGenus != "") {
    // The genus works as a name prefix
    return filterGenus;
  } else {
    // No filter
    return "";
  }
}

function getSightingsURL(offset) {
  dates = getFormattedQueryDates();
  result = `${baseURL}/sightings/${offset}/${dates.get("min")}/${dates.get("max")}`;

  if (getFullNameFilter() != "") {
    result += `/${getFullNameFilter()}`;
  }

  return result;
}

async function getAllBirds() {
  console.log("Getting all bird sightings");
  sightingMarkers.clearLayers();
  totalCount = 0;

  // Update displays to describe the current search
  dates = getFormattedQueryDates();
  d3.select("#current-count").text(totalCount);
  d3.select("#min-current-date").text(dates.get("min"));
  d3.select("#max-current-date").text(dates.get("max"));

  // The genus name, if there is one, links to more info
  d3.select("#current-genus-filter").html(null);
  if (filterGenus != "") {
    let infoLink = getInfoLink(filterGenus);
    d3.select("#current-genus-filter").html(null).append("A").property("href", infoLink).text(filterGenus);
  }

  // Same deal for species name
  d3.select("#current-species-filter").html(null);
  if (filterSpecies != "") {
    let infoLink = getInfoLink(filterSpecies);
    d3.select("#current-species-filter").html(null).append("A").property("href", infoLink).text(filterSpecies);
  }

  // Get the count of results for our imminent search. The URL must always include dates,
  // but may or may not include a name:
  countURL = `${baseURL}/count/${dates.get("min")}/${dates.get("max")}`;
  if (getFullNameFilter() != "") {
    countURL += `/${getFullNameFilter()}`;
  }

  // Indicate that we'll be loading data
  loadingSightings = true;
  setLoadProgress(0);
  checkControlStates();

  // Get the count of sightings first so the display shows reasonable values
  await d3.json(countURL).then(function (response) {
    d3.select("#max-current-count").text(response);
    filteredCount = response;
  });

  // The sighting trend graph can populate asynchronously to getting the individual sighting data:
  let graphPromise = drawSightingGraphs();

  // Finally, do the actual call to get sighting data. This will be done repeatedly until we get them all.
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
  result.set("min", `${simpleDateFormat(filterStartDate)}`);
  result.set("max", `${simpleDateFormat(filterEndDate)}`);
  return result;
}

function simpleDateFormat(date) {
  return `${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}`;
}

function applyFilters() {
  // Record the filter controls' values so the will be used in the next search
  filterDates = minPicker.getRange();
  filterEndDate = filterDates.end;
  filterStartDate = filterDates.start;
  filterGenus = d3.select("#genus-picker").property("value");
  filterSpecies = d3.select("#species-picker").property("value");

  console.log(`Apply filter ${getFormattedQueryDates().get("min")} - ${getFormattedQueryDates().get("max")}, ${getFullNameFilter()}`);

  // Do the search
  getAllBirds();
}

async function drawSightingGraphs() {
  /*!!!!!!!!!!!!!!!!!
    This is handling dates wrong, because the API doesn't return 0 for no sightings. It just doesn't list that date.
    To work with that API, this code needs to build a list of all dates in range and populate a list of counts,
    putting in 0's where needed.

    I suspect this will be easier to fix in the API.
  */
  console.log("Populating sighting trend graphs");

  loadingTrends = true;
  checkControlStates();

  qdates = getFormattedQueryDates();
  let baseQueryUrl = `${baseURL}/trend/${qdates.get("min")}/${qdates.get("max")}`;
  let queryUrl = baseQueryUrl;
  if (getFullNameFilter() != "") {
    queryUrl += `/${getFullNameFilter()}`;
  }

  let filteredName = filterSpecies == "" ? "genus" : "species";

  d3.json(queryUrl).then(await async function (filteredResponse) {
      // Get the dates -- we may do several queries but they should all return the same dates
      let dates = filteredResponse.dates.map(
        (dateString) => new Date(dateString)
      );      

      // Build a line chart based on the raw counts
      let countTrace = {
        x: dates,
        y: filteredResponse.counts,
        type: "line",
        name: filteredName,
      };

      let countData = [countTrace];

      let genusCounts = []; // Also useful for the percentage graph if applicable
      if (filterSpecies != "") {
        // The original search was for a full species name, so we can search for just the genus
        // and get another set of interesting counts
        await d3.json(`${baseQueryUrl}/${filterGenus}`).then(function (genusResponse) {
          genusCounts = genusResponse.counts;
        });

        let genusCountTrace = {
          x: dates,
          y: genusCounts,
          type: "line",
          name: "genus",
        };
        countData.push(genusCountTrace);
      }

      let countLayout = {
        title: "Number of Sightings Reported",
        xaxis: { 
          title: "Date"
        },
        yaxis: {
          title: "Sightings",
          rangemode: "tozero",
        },
        showlegend: countData.length > 1,
      };

      // Render the raw count chart
      Plotly.newPlot("sighting-trend-graph-count", countData, countLayout, {
        responsive: true,
      });

      // There is a graph showing percent of total sightings, but it is only significant when a name filter is used
      if (getFullNameFilter() == "") {
        d3.select("#sighting-trend-graph-percent").style("display",DISPLAY_OFF);
        d3.select("#sighting-trend-graph-percent-explanation").text("A percentage-based graph is available when genus is selected.");
      } else {
        d3.select("#sighting-trend-graph-percent").style("display", DISPLAY_ON);
        d3.select("#sighting-trend-graph-percent-explanation").text("This may be a better indicator of birds' prevalence, since bird watcher activity varies day-to-day");

        // Build a similar chart based on percent of total -- which requires a new query since the first was filtered by name
        let totalCounts;

        // Do the query WITHOUT the name filter to get all sightings per day
        await d3.json(baseQueryUrl).then(function (unfilteredResponse) {
          totalCounts = unfilteredResponse.counts;
        });

        // Calculate the percentages
        let filteredPercentages = [];
        for (i = 0; i < filteredResponse.counts.length; i++) {
          filteredPercentages.push(filteredResponse.counts[i] / totalCounts[i]);
        }        

        let filteredPercentTrace = {
          x: dates,
          y: filteredPercentages,
          type: "line",
          name: filteredName,
        };

        let percentData = [filteredPercentTrace];

        if (filterSpecies != "") {
          // The original search was for a full species name, so we can plot the genus percentages too
          let genusPercentages = [];
          for (i = 0; i < genusCounts.length; i++) {
            genusPercentages.push(genusCounts[i] / totalCounts[i]);
          }

          let genusPercentTrace = {
            x: dates,
            y: genusPercentages,
            type: "line",
            name: "genus",
          };
          percentData.push(genusPercentTrace);
        }

        let percentLayout = {
          title: "Percent of Total Sightings",
          xaxis: {
            title: "Date"
          },
          yaxis: {
            title: "Sighting (%)",
            tickformat: ",.2%",
            rangemode: "tozero",
          },
          showlegend: percentData.length > 1,
        };

        // Render the percentage chart
        Plotly.newPlot(
          "sighting-trend-graph-percent",
          percentData,
          percentLayout,
          { responsive: true }
        );
      }

      loadingTrends = false;
      checkControlStates();
    }
  );
}

function toggleView() {
  let buttonElement = d3.select("#toggle-view");
  if (buttonElement.text() == TOGGLE_BUTTON_GRAPHS) {
    // Change to Graph view, set button text to Map:
    buttonElement.text(TOGGLE_BUTTON_MAP);
  } else {
    // Change to Map view, set button text to Graphs:
    buttonElement.text(TOGGLE_BUTTON_GRAPHS);
  }

  checkControlStates();
}

function abortLoad() {
  aborting = true;
}

function changeGenus(genusSelector) {
  // When a new genus is selected, the species selector needs to be reset
  let speciesSelector = d3.select("#species-picker");
  speciesSelector.selectAll("option").remove();
  
  let fullNames = genusSpeciesMap.get(genusSelector.value);
  if (fullNames != undefined) {
    // Refill the species select with species associated with the new genus
    console.log(`Changing to genus ${genusSelector.value} -> ${fullNames}`);
    speciesSelector.append("option").text("").property("value", "");
    fullNames.forEach((fullName) => {
      speciesSelector.append("option").text(fullName).property("value", fullName);
    });
  }
}

async function initialize() {
  console.log("Initializing");

  // Adding the tile layer
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(myMap);

  // Add our marker cluster layer to the map.
  myMap.addLayer(sightingMarkers);

  // Set up the toggle button
  d3.select("#toggle-view").text(TOGGLE_BUTTON_DEFAULT);

  // Fetching initial data from the API is asnchronous, but the sighting data depends on some other data
  // so there is an order dependency:
  await getStaticInfo();
  await getAllBirds();
  console.log("Initialization complete");
}

initialize();
