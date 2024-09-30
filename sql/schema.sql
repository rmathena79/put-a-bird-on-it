-- This file contains the SQL commands to create all tables
DROP TABLE IF EXISTS sightings;
DROP TABLE IF EXISTS common_names;
DROP TABLE IF EXISTS scientific_names;

CREATE TABLE scientific_names (
    id INT PRIMARY KEY,
    scientific_name VARCHAR(128) NOT NULL
);

CREATE TABLE common_names (
    id INT PRIMARY KEY,
    scientific_name VARCHAR(128) NOT NULL
);

CREATE TABLE sightings (
    id CHAR(47) PRIMARY KEY,
    common_name INT NOT NULL,
    FOREIGN KEY (common_name) REFERENCES common_names(id),
    scientific_name INT NOT NULL,
    FOREIGN KEY (scientific_name) REFERENCES scientific_names(id),
    latitude DECIMAL NOT NULL,
    longitude DECIMAL NOT NULL,
    observation_date DATE NOT NULL
);