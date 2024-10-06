# put-a-bird-on-it
Plotting bird sightings from eBird

# Citations
Bird sighting data comes from eBird's (https://ebird.org/home) Basic Dataset. The code should work with any snapshot of their data, but I have been using subsets of this version:
* eBird Basic Dataset. Version: EBD_relApr-2022. Cornell Lab of Ornithology, Ithaca, New York. 9/26/2024.

The map links to pages from Animal Diversity Web (https://animaldiversity.org/) for detail about each species.

# Instructions

In addition to a standard "dev" environment from class, you'll need to install psycopg2 for sqlalchemty to connect to postgresql.

# Development Notes

PROBLEMS TO SOLVE BEFORE SUBMISSION
* Trend graphs are not clear and need context
* Searching with blank dates doesn't work, and the dates don't auto-populate initially

LESSER PROBLEMS
* Needs an overall beautification effort
* Date picker needs min/max and probably smarter initial value

BIG IDEAS
* Link popups to species characteristics from Avonet
  * Use Avonet's name list as definitive, for scientific names
* Provide a way to show graphs of characteristics of selected species vs. the rest of its genus and all birds
* (Can't find a good source without scraping) Show pictures in popups

TODO
* Add a STOP button when loading
* Make Enter work for applying filters
* Show what filters were used for currently displayed result set
* Simplify name selection with dropsdowns for genus or full scientific name
* Consolidate redundant code
* Move "normalization" script to a simple .py or maybe the math-ena module, and don't call it "normalization".
* Probably make all table and column names lowercase
* Ideally eBird citation data should come from the database, since it could vary depending on dataset.
* Consider forcing names to all lowercase in the database, and correcting it for presentation in the page