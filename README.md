# put-a-bird-on-it
Plotting bird sightings from eBird

# Citations
Bird sighting data, comes from eBird, and this repository includes a copy of their SAMPLE data set as of 9/26/2024:
eBird Basic Dataset. Version: EBD_relApr-2022. Cornell Lab of Ornithology, Ithaca, New York. 9/26/2024.

# Instructions

In addition to a standard "dev" environment from class, you'll need to install psycopg2 for sqlalchemty to connect to postgresql.

# Development Notes

PROBLEMS
* Trend search in API isn't returning the counts, just the dates. I have a query that gets the counts but am not sure how to jsonify it.
* Searching with blank dates doesn't work, and the dates don't auto-populate initially
* Min/max dates aren't showing for the database contents. Think I just removed that code mistakenly.

BIG IDEAS
* Show graph of sightings over time
* Link popups to species characteristics (requires another data set)
* Show pictures in popups (requires another data set or maybe there's something in the eBird data)
* Provide a way to show graphs of characteristics of selected species vs. the rest of its order and all birds

TODO
* Make it pretty
* Date picker needs min/max and probably smarter initial value
* Simplify name selection with dropsdowns for genus or full scientific name
* Enable/disable controls during loading
* Consolidate redundant code
* Move "normalization" script to a simple .py or maybe the math-ena module, and don't call it "normalization".
* Probably make all table and column names lowercase
* Ideally eBird citation data should come from the database, since it could vary depending on dataset.
* Consider forcing names to all lowercase in the database, and correcting it for presentation in the page
* Show what filters were used for currently displayed result set