# put-a-bird-on-it
Plotting bird sightings from eBird

# Citations
Bird sighting data, comes from eBird, and this repository includes a copy of their SAMPLE data set as of 9/26/2024:
eBird Basic Dataset. Version: EBD_relApr-2022. Cornell Lab of Ornithology, Ithaca, New York. 9/26/2024.

# Instructions

In addition to a standard "dev" environment from class, you'll need to install psycopg2 for sqlalchemty to connect to postgresql.

# Development Notes

PROBLEMS
* Dependency between dates and getting initial sightings is enforced with only a sleep
* Where'd my map go?

TODO
* Do something good while loading large amounts of data
* Show the count
* Consolidate redundant code
* Ideally eBird citation data should come from the database, since it could vary depending on dataset.
* Move "normalization" script to a simple .py or maybe the math-ena module, and don't call it "normalization".
* Probably make all table and column names lowercase