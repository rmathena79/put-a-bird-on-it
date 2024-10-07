# put-a-bird-on-it
Plotting bird sightings from eBird

# Citations
Bird sighting data comes from eBird's (https://ebird.org/home) Basic Dataset. The code should work with any snapshot of their data, but I have been using subsets of this version:
* eBird Basic Dataset. Version: EBD_relApr-2022. Cornell Lab of Ornithology, Ithaca, New York. 9/26/2024.

Multiple elements link to pages from Animal Diversity Web (https://animaldiversity.org/) for detail about each taxonomic group.

# Instructions

In addition to a standard "dev" environment from class, you'll need to install psycopg2 for sqlalchemy to connect to postgresql.

# Contents
* ...

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
