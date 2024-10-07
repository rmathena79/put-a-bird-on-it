# put-a-bird-on-it
Project 3 for Data Analytics Boot Camp. Submitted October, 2024.

This project defines a database of bird sightings, an API for accessing that data, and a web site which plots sightings on an interactive map. Search / filter options are provided for dates and bird genus or species. There are also graphs showing when birds have been sighted and how the counts for category of birds (genus or species) relates to all sightings.

# Notes to Graders
Reviewing the requirements for the Data Visualization Track:

1. "Your project must include visualizations". The web page uses Leaflet for the map and Plotly for the graphs.
1. "Data must be stored in and extracted from at least one database". I stripped down data from eBird and put it in a local SQL database. I shouldn't redistribute the data but there are screenshots showing the database.
1. "Your project should include at least one JavaScript or Python library that we did not cover". I used js-datepicker for data selection controls, described here: https://www.npmjs.com/package/js-datepicker
1. "Your project must be powered by a dataset with at least 100 records". I will be demonstrating it with 3.7 million rows.
1. "Your project must include some level of user-driven interaction". In addition to the Flask backend (I'm not sure that counts as user-driven), the web page has several dynamic interactive elements. There are controls to select dates, genus, or species for search filtering. The map and graphs have built-in interactivity. There's even a loading screen with a giant "abort" button for when you try to load too much data.
1. "Your final visualization should ideally include at least three views". There is the map and two graphs.


# Repo Contents
* **prep-data.py**: Script to process raw data files from eBird, generating CSVs for import into SQL database
* **sql/schema.sql**: Table definitions for SQL database
* **flask/app.py**: Flask API implementation, providing structured access to the database
* **www/static/css/style.css**: Minimal CSS files, based on class exercises
* **www/static/js/logic.js**: My javascript implementation
* **www/index.html**: The web page
* **www/loading.gif**: A giant spinning spiral animation

Need to add:
* Presentation
* Screenshots illustrating database, since I can't distribute the data


# Instructions

In addition to a standard "dev" environment from class, you'll need to install psycopg2 for sqlalchemy to connect to postgresql in the Flask App.

1. Acquire a snapshot of eBird's Basic Dataset (https://ebird.org/home). eBird provides a small sample database with registration, but for more complete access you must apply for permission.
1. Modify prep_data.py to refer to your database snapshot as a source. The main database file will be named something like "ebd_US-OR_202308_202408_relAug-2024.txt". Run the script and it should create a set of .CSV in the output directory.
1. Set up a SQL database and create tables with sql/schema.sql. I have been using Postgresql.
1. Import your generated CSVs into their corresponding tables.
1. Create a flask/credentials.py file so the Flask API can connect to your database. This is an example:

        SERVER = "localhost"
        PORT = 5432
        USER = "postgres"
        PASSWORD = "thisisnotmypassword"
        DATABASE = "ebird_board"
        
1. Launch the Flask API, generally by going to the flask directory in your terminal and running either "python app.py" or "flask run". Note I have only been running it in development mode.
1. Launch a web server using the www directory as it's root. I've just been using VSCode Live Server to launch index.html.


# Citations
Bird sighting data comes from eBird's (https://ebird.org/home) Basic Dataset. The code should work with any snapshot of their data, but I have been using subsets of this version:
* eBird Basic Dataset. Version: EBD_relApr-2022. Cornell Lab of Ornithology, Ithaca, New York. 9/26/2024.

Multiple elements link to pages from Animal Diversity Web (https://animaldiversity.org/) for detail about each taxonomic group.

The loading animation was posted to Stack Overflow without any restriction noted: https://stackoverflow.com/questions/35566048/load-animated-gif-in-uiimageview-ios

# Development Notes

PROBLEMS TO SOLVE BEFORE SUBMISSION
* ...

LESSER PROBLEMS
* I suspect there are still some time zone problems lurking in the graph generation code

BIG IDEAS
* Link popups to species characteristics from Avonet
  * Use Avonet's name list as definitive, for scientific names
* Provide a way to show graphs of characteristics of selected species vs. the rest of its genus and all birds
* (Can't find a good source without scraping) Show pictures in popups

TODO
* Clean up graph generation code
* Make Enter work for applying filters
* Probably make all table and column names lowercase
* Ideally eBird citation data should come from the database, since it could vary depending on dataset.
