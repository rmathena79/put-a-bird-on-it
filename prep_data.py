# This script takes a CSV (.txt) file as distributed as eBird's Basic Data Set,
# strips out what we don't need, separates out common and scientific names, and
# saves new CSVs suitable to import to SQL using the associated schema.
#
# Note the actual data is NOT distributed with this script, as eBird does not allow
# redistribution. For access:
# https://ebird.org/data/download

import pandas as pd
import numpy as np
import os

# This sample data is nice and small:
SOURCE = "data/eBird_SampleData/ebd_US-AL-101_202204_202204_relApr-2022.txt"

# This is the main dataset, which takes much longer to clean and import:
# SOURCE = "data/ebd_US-OR_202308_202408_relAug-2024/ebd_US-OR_202308_202408_relAug-2024.txt"

OUT_DIR = "output"

# Important column names. Note these are the final forms, after renaming to remove spaces:
COL_ID = "GLOBAL_UNIQUE_IDENTIFIER"
COL_TAX_CATEGORY = "CATEGORY"
COL_COMMON_NAME = "COMMON_NAME"
COL_SCI_NAME = "SCIENTIFIC_NAME"
COL_LAT = "LATITUDE"
COL_LONG = "LONGITUDE"
COL_DATE = "OBSERVATION_DATE"
FINAL_CARE_COLUMNS = [
    COL_ID,
    COL_COMMON_NAME,
    COL_SCI_NAME,
    COL_LAT,
    COL_LONG,
    COL_DATE,
]
ENUMERATE_COLUMNS = [COL_COMMON_NAME, COL_SCI_NAME]


# Take a single dataframe, enumerate values in the specified columns, and replace
# those values with IDs referring to newly created dataframes for those columns.
def separate_tables(df, column_names):
    value_dfs = {}
    result_df = df.copy()

    for column_name in column_names:
        print(f"Extracting values for column {column_name}")

        # Build a table for the extracted values, giving each unique value an ID number
        values = df[column_name].unique()
        print(f"Found {len(values)} unique values")

        ids = np.arange(1, len(values) + 1)
        print("Building new dataframe")
        value_df = pd.DataFrame({"id": ids, column_name: values})
        value_dfs[column_name] = value_df

        # Replace the literal values with their ID in the original dataframe
        print("Building replacement maps")
        replacements = {}
        for i in range(0, len(values)):
            value = values[i]
            id = ids[i]
            replacements[value] = id

        print("Replacing all literals with IDs")
        result_df[column_name] = result_df[column_name].replace(replacements)
    return result_df, value_dfs


# Read the data
raw_df = pd.read_csv(SOURCE, sep="\t")

# Drop all sightings categories by anything other than species (just for simplification)
df = raw_df.loc[raw_df[COL_TAX_CATEGORY] == "species"]

# Change a few column names to avoid spaces in names
df = df.rename(columns={COL_ID.replace("_", " "): COL_ID})
df = df.rename(columns={COL_COMMON_NAME.replace("_", " "): COL_COMMON_NAME})
df = df.rename(columns={COL_SCI_NAME.replace("_", " "): COL_SCI_NAME})
df = df.rename(columns={COL_DATE.replace("_", " "): COL_DATE})

# Remove extraneous columns
df = df.loc[:, FINAL_CARE_COLUMNS]

# Get the separated dataframes
(ndf, vdfs) = separate_tables(df, ENUMERATE_COLUMNS)

# Save all the dataframes as CSVs
if not os.path.exists(OUT_DIR):
    os.makedirs(OUT_DIR)

out_path = os.path.join(OUT_DIR, "sightings.csv")
print(f"Saving main data: {out_path}")
ndf.to_csv(out_path, index=False)
for c in ENUMERATE_COLUMNS:
    out_path = os.path.join(OUT_DIR, f"{c}.csv")
    print(f"Saving {c} data: {out_path}")
    vdfs[c].to_csv(out_path, index=False)
