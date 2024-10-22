import os

from flask import Flask, request, render_template, redirect, url_for, jsonify
import numpy as np
import datetime

from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, func

from credentials import SERVER, PORT, USER, PASSWORD, DATABASE

MAX_SIGHTINGS = 3333

# Set up connection to database
engine = create_engine(f"postgresql://{USER}:{PASSWORD}@{SERVER}:{PORT}/{DATABASE}")

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
        f"<li><B>/api/v1.0/scientific_names</B>: Get ALL scientific names and IDs.</li>"
        f"<li><B>/api/v1.0/dates</B>: Get min and max dates with available sightings.</li>"
        f"<li><B>/api/v1.0/count/&ltmin-date&gt/&ltmax-date&gt</B>: Get total number of sightings available in date range.</li>"
        f"<li><B>/api/v1.0/count/&ltmin-date&gt/&ltmax-date&gt/&ltscientific-name&gt</B>: Get total number of sightings available in date range, matching name.</li>"
        f"<li><B>/api/v1.0/trend/&ltmin-date&gt/&ltmax-date&gt</B>: Get day-by-day number of sightings in date range. Sorted alphabetically.</li>"
        f"<li><B>/api/v1.0/trend/&ltmin-date&gt/&ltmax-date&gt/&ltscientific-name&gt</B>: Get day-by-day number of sightings in date range, matching name. Sorted alphabetically.</li>"
        f"<li><B>/api/v1.0/sightings/&ltoffset&gt/&ltmin-date&gt/&ltmax-date&gt</B>: Get sightings data, offset as specified, within date range. Sorted by date.</li>"
        f"<li><B>/api/v1.0/sightings/&ltoffset&gt/&ltmin-date&gt/&ltmax-date&gt/&ltscientific-name&gt</B>: Get sightings data, offset as specified, within date range, matching name. Sorted by date.</li>"
        f"</ul>"
        f"<h2>Usage Notes</h2>"
        f"<ul>"
        f"<li>Dates should be specified in YYYY-MM-DD format.</li>"
        f"<li>Names are matched by finding names that start with the specified string. So to search for all species within a genus, specify only the genus name. To search for a single species, specify the full scientific name (genus and species). Note this is case sensitive; the genus name is capitalized and the species name is not.</li>"
        f"<li>Sightings are sent {MAX_SIGHTINGS} events at a time. Use the offset to download the entire result set.</li>"
    )


# We need a header item to allow Cross-Origin Resource Sharing, so just add it to every response
@app.after_request
def apply_caching(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response


@app.route("/api/v1.0/common_names")
def get_cnames():
    with Session(engine) as session:
        results = session.query(cnames_tbl.id, cnames_tbl.common_name).all()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    return response


@app.route("/api/v1.0/scientific_names")
def get_snames():
    with Session(engine) as session:
        results = session.query(snames_tbl.id, snames_tbl.scientific_name).all()

    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    return response


@app.route("/api/v1.0/dates")
def get_dates():
    with Session(engine) as session:
        min = session.query(func.min(sightings_tbl.observation_date)).scalar()
        max = session.query(func.max(sightings_tbl.observation_date)).scalar()

    results_dict = {"min": min, "max": max}
    response = jsonify(results_dict)
    return response


@app.route("/api/v1.0/count/<min_date>/<max_date>")
def get_sighting_count_date(min_date, max_date):
    return get_sighting_count_date_name(min_date, max_date, "")


@app.route("/api/v1.0/count/<min_date>/<max_date>/<namePrefix>")
def get_sighting_count_date_name(min_date, max_date, namePrefix):
    with Session(engine) as session:
        q = session.query(
            sightings_tbl.common_name,
            sightings_tbl.scientific_name,
            sightings_tbl.latitude,
            sightings_tbl.longitude,
            sightings_tbl.observation_date,
        ).filter(sightings_tbl.observation_date.between(min_date, max_date))

        if namePrefix != "":
            # Filter by name
            ids = get_ids(session, namePrefix)
            q = q.filter(sightings_tbl.scientific_name.in_(ids))
    results = q.count()
    response = jsonify(results)
    return response


@app.route("/api/v1.0/trend/<min_date>/<max_date>")
def get_sighting_trend_date(min_date, max_date):
    return get_sighting_trend_date_name(min_date, max_date, "")


@app.route("/api/v1.0/trend/<min_date>/<max_date>/<namePrefix>")
def get_sighting_trend_date_name(min_date, max_date, namePrefix):
    with Session(engine) as session:
        q = (
            session.query(
                sightings_tbl.observation_date,
                func.count(sightings_tbl.observation_date).label("sightings"),
            )
            .filter(sightings_tbl.observation_date.between(min_date, max_date))
            .order_by(sightings_tbl.observation_date)
            .group_by(sightings_tbl.observation_date)
        )

        if namePrefix != "":
            # Filter by name
            ids = get_ids(session, namePrefix)
            q = q.filter(sightings_tbl.scientific_name.in_(ids))

        results = q.all()

    # Results aren't initially in a very convenient form, so turn it into
    # a list of dates and a list of counts
    flattened = np.ravel(results, order="F")
    db_dates = list(flattened[: len(flattened) // 2])
    db_counts = list(flattened[-len(flattened) // 2 :])

    # We need to return data for every date in range, which means inserts 0's
    # for dates that didn't have any sightings in the query results.
    min_dt = datetime.datetime.strptime(min_date, "%Y-%m-%d").date()
    max_dt = datetime.datetime.strptime(max_date, "%Y-%m-%d").date()

    db_i = 0
    final_dates = list(np.arange(min_dt, max_dt + datetime.timedelta(days=1)))
    final_counts = []

    for date in final_dates:
        if db_dates[db_i] == date:
            # We got a sighting count for this date from the database
            final_counts.append(db_counts[db_i])
            db_i += 1
        else:
            # We didn't get a count from the DB, so it's zero
            final_counts.append(0)

    # The date list was generated with a numpy type above, so now
    # we need to convert to a more standard type:
    final_dates = [date.astype(datetime.datetime) for date in final_dates]
    results_dict = {"dates": final_dates, "counts": final_counts}
    response = jsonify(results_dict)
    return response


@app.route("/api/v1.0/sightings/<offset>/<min_date>/<max_date>")
def get_sightings_date(offset, min_date, max_date):
    return get_sightings_date_name(offset, min_date, max_date, "")


@app.route("/api/v1.0/sightings/<offset>/<min_date>/<max_date>/<namePrefix>")
def get_sightings_date_name(offset, min_date, max_date, namePrefix):
    with Session(engine) as session:
        q = (
            session.query(
                sightings_tbl.id,
                sightings_tbl.common_name, 
                sightings_tbl.scientific_name,
                sightings_tbl.latitude,
                sightings_tbl.longitude,
                sightings_tbl.observation_date,
            )
            .filter(sightings_tbl.observation_date.between(min_date, max_date))
            .order_by(sightings_tbl.observation_date)
            .order_by(sightings_tbl.id)
        )

        if namePrefix != "":
            # Filter by name
            ids = get_ids(session, namePrefix)
            q = q.filter(sightings_tbl.scientific_name.in_(ids))

    results = q.offset(offset).limit(MAX_SIGHTINGS).all()
    results_dicts = [r._asdict() for r in results]
    response = jsonify(results_dicts)
    return response


def get_ids(session, namePrefix):
    idResults = (
        session.query(snames_tbl.id)
        .filter(snames_tbl.scientific_name.startswith(namePrefix))
        .all()
    )
    ids = [result[0] for result in idResults]
    return ids


# This comes from a generated passenger_wsgi.py file, and I don't really understand what it's all for:
project_root = os.path.dirname(os.path.realpath('__file__'))
template_path = os.path.join(project_root, 'app/templates')
static_path = os.path.join(project_root, 'app/static')
app = Flask(__name__, template_folder=template_path, static_folder=static_path)
application = app

if __name__ == "__main__":
    app.run(debug=True)