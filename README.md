# put-a-bird-on-it
Plotting bird sightings from eBird

# Citations
Bird sighting data comes from eBird (SAMPLE data set as of 9/26/2024):
eBird Basic Dataset. Version: EBD_rel$VERSION. Cornell Lab of Ornithology, Ithaca, New York. $DATE.

# Instructions

In addition to a standard "dev" environment from class, you'll need to install psycopg2 for sqlalchemty to connect to postgresql.

# Development Notes

PROBLEMS
* None... at the moment

TODO
* Move "normalization" script to a simple .py or maybe the math-ena module, and don't call it "normalization".
* Probably make all table and column names lowercase
* Make ID replacement more efficient by building up one big dictionary of replacement mappings