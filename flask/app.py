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
        f"Available Routes:<br/>"
        f"<ul>"
        f"<li><B>/api/v1.0/common_names</B>: Get ALL common names and IDs</li>"
        f"<li><B>/api/v1.0/scientific_names</B>: Get ALL scientific names and IDs</li>"
        f"<li><B>/api/v1.0/dates</B>: Get min and max dates with available sightings</li>"
        f"<li><B>/api/v1.0/count/&ltmin-date&gt/&ltmax-date&gt</B>: Get number of sightings available in specified date range (YYYY-MM-DD)</li>"
        f"<li><B>/api/v1.0/sightings/&ltoffset&gt/&ltmin-date&gt/&ltmax-date&gt</B>: Get sighting data {MAX_SIGHTINGS} events at a time, offset as specified and within date range (YYYY-MM-DD)</li>"
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
def get_sighting_count(min_date, max_date):
    with Session(engine) as session:
        results = session.query(sightings_tbl.common_name, sightings_tbl.scientific_name, 
                                sightings_tbl.latitude, sightings_tbl.longitude,
                                sightings_tbl.observation_date) \
                                .filter(sightings_tbl.observation_date.between(min_date, max_date)) \
                                .count()

    response = jsonify(results)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/sightings/<offset>/<min_date>/<max_date>")
def get_sightings(offset, min_date, max_date):
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

if __name__ == '__main__':
    app.run(debug=True)
