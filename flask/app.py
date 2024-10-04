import numpy as np
import sqlalchemy

from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, func
from flask import Flask, jsonify

from credentials import SERVER, PORT, USER, PASSWORD, DATABASE

MAX_SIGHTINGS = 3333


# Set up connection to database
engine = create_engine(f'postgresql://{USER}:{PASSWORD}@{SERVER}:{PORT}/{DATABASE}')

# reflect an existing database into a new model
Base = automap_base()
Base.prepare(autoload_with=engine)

# Save reference to the tables
sightings_tbl = Base.classes.sightings
cnames_tbl = Base.classes.common_names
snames_tbl = Base.classes.scientific_names

#################################################
# Flask Setup
#################################################
app = Flask(__name__)

#################################################
# Flask Routes
#################################################

@app.route("/")
def welcome():
    """List all available api routes."""
    return (
        f"<h2>Available Routes</h2>"
        f"<ul>"
        f"<li><B>/api/v1.0/common_names</B>: Get ALL common names and IDs</li>"
        f"<li><B>/api/v1.0/scientific_names</B>: Get ALL scientific names and IDs</li>"
        f"<li><B>/api/v1.0/dates</B>: Get min and max dates with available sightings</li>"
        f"<li><B>/api/v1.0/count/&ltmin-date&gt/&ltmax-date&gt</B>: Get total number of sightings available in date range</li>"
        f"<li><B>/api/v1.0/count/&ltmin-date&gt/&ltmax-date&gt/&ltscientific-name&gt</B>: Get total number of sightings available in date range, matching name</li>"
        f"<li><B>/api/v1.0/trend/&ltmin-date&gt/&ltmax-date&gt</B>: Get day-by-day number of sightings in date range</li>"
        f"<li><B>/api/v1.0/trend/&ltmin-date&gt/&ltmax-date&gt/&ltscientific-name&gt</B>: Get day-by-day number of sightings in date range, matching name</li>"
        f"<li><B>/api/v1.0/sightings/&ltoffset&gt/&ltmin-date&gt/&ltmax-date&gt</B>: Get sightings data, offset as specified, within date range</li>"
        f"<li><B>/api/v1.0/sightings/&ltoffset&gt/&ltmin-date&gt/&ltmax-date&gt/&ltscientific-name&gt</B>: Get sightings data, offset as specified, within date range, matching name</li>"
        f"</ul>"
        f"<h2>Usage Notes</h2>"
        f"<ul>"
        f"<li>Dates should be specified in YYYY-MM-DD format.</li>"
        f"<li>Names are matched by finding names that start with the specified string. So to search for all species within a genus, specify only the genus name. To search for a single species, specify the full scientific name (genus and species). Note this is case sensitive; the genus name is capitalized and the species name is not.</li>"
        f"<li>Sightings are sent {MAX_SIGHTINGS} events at a time. Use the offset the download the entire result.</li>"
    )

@app.route("/api/v1.0/common_names")
def get_cnames():
    with Session(engine) as session:
        results = session.query(cnames_tbl.id, cnames_tbl.common_name).all()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/scientific_names")
def get_snames():
    with Session(engine) as session:
        results = session.query(snames_tbl.id, snames_tbl.scientific_name).all()
    
    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/dates")
def get_dates():
    with Session(engine) as session:
        min = session.query(func.min(sightings_tbl.observation_date)).scalar()
        max = session.query(func.max(sightings_tbl.observation_date)).scalar()

    results_dict = {'min': min, 'max': max}
    response = jsonify(results_dict)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/count/<min_date>/<max_date>")
def get_sighting_count_date(min_date, max_date):
    with Session(engine) as session:
        results = session.query(sightings_tbl.common_name, sightings_tbl.scientific_name, 
                                sightings_tbl.latitude, sightings_tbl.longitude,
                                sightings_tbl.observation_date) \
                                .filter(sightings_tbl.observation_date.between(min_date, max_date)) \
                                .count()

    response = jsonify(results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/count/<min_date>/<max_date>/<namePrefix>")
def get_sighting_count_date_name(min_date, max_date, namePrefix):
    with Session(engine) as session:
        # First we need the IDs of matching scientific names
        idResults = session.query(snames_tbl.id) \
                                  .filter(snames_tbl.scientific_name.startswith(namePrefix)) \
                                  .all()
        ids = [result[0] for result in idResults]

        results = session.query(sightings_tbl.common_name, sightings_tbl.scientific_name, 
                                sightings_tbl.latitude, sightings_tbl.longitude,
                                sightings_tbl.observation_date) \
                                .filter(sightings_tbl.observation_date.between(min_date, max_date)) \
                                .filter(sightings_tbl.scientific_name.in_(ids)) \
                                .count()

    response = jsonify(results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/trend/<min_date>/<max_date>")
def get_sighting_trend_date(min_date, max_date):
    with Session(engine) as session:
        results = session.query(sightings_tbl.observation_date, func.count(sightings_tbl.observation_date)) \
                                .filter(sightings_tbl.observation_date.between(min_date, max_date)) \
                                .group_by(sightings_tbl.observation_date) \
                                .all()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/sightings/<offset>/<min_date>/<max_date>")
def get_sightings_date(offset, min_date, max_date):
    with Session(engine) as session:
        results = session.query(sightings_tbl.common_name, sightings_tbl.scientific_name, 
                                sightings_tbl.latitude, sightings_tbl.longitude,
                                sightings_tbl.observation_date) \
                                .filter(sightings_tbl.observation_date.between(min_date, max_date)) \
                                .offset(offset).limit(MAX_SIGHTINGS).all()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/sightings/<offset>/<min_date>/<max_date>/<namePrefix>")
def get_sightings_date_name(offset, min_date, max_date, namePrefix):
    with Session(engine) as session:
        # First we need the IDs of matching scientific names
        idResults = session.query(snames_tbl.id) \
                                  .filter(snames_tbl.scientific_name.startswith(namePrefix)) \
                                  .all()
        ids = [result[0] for result in idResults]

        results = session.query(sightings_tbl.common_name, sightings_tbl.scientific_name, 
                                sightings_tbl.latitude, sightings_tbl.longitude,
                                sightings_tbl.observation_date) \
                                .filter(sightings_tbl.observation_date.between(min_date, max_date)) \
                                .filter(sightings_tbl.scientific_name.in_(ids)) \
                                .offset(offset).limit(MAX_SIGHTINGS).all()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == '__main__':
    app.run(debug=True)
