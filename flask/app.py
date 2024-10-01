import numpy as np
import sqlalchemy

from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, func

from flask import Flask, jsonify

from credentials import SERVER, PORT, USER, PASSWORD, DATABASE

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
        f"/api/v1.0/common_names<br/>"
        f"/api/v1.0/scientific_names<br/>"
        f"/api/v1.0/sightings/&ltoffset&gt<br/>"
    )

@app.route("/api/v1.0/common_names")
def cnames():
    session = Session(engine)
    results = session.query(cnames_tbl.id, cnames_tbl.common_name).all()
    session.close()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/scientific_names")
def snames():
    session = Session(engine)
    results = session.query(snames_tbl.id, snames_tbl.scientific_name).all()
    session.close()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route("/api/v1.0/sightings/<offset>")
def sightings(offset):
    MAX_RESULTS = 1000
    session = Session(engine)
    results = session.query(sightings_tbl.common_name, sightings_tbl.scientific_name, sightings_tbl.latitude, 
                            sightings_tbl.longitude).offset(offset).limit(MAX_RESULTS).all()
    session.close()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == '__main__':
    app.run(debug=True)
