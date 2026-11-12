CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE mesures (
    time TIMESTAMP NOT NULL,
    capteur_id TEXT NOT NULL,
    temperature DOUBLE PRECISION,
    humidite DOUBLE PRECISION,
    pression DOUBLE PRECISION,
);

SELECT create_hypertable ('mesures', 'time');

CREATE INDEX ON mesures (capteur_id, time DESC);

CREATE TABLE capteurs (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    type TEXT NOT NULL
);

CREATE TABLE utilisateurs (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
);

CREATE TABLE seuils (
    id TEXT PRIMARY KEY,
    capteur_id TEXT NOT NULL,
    grandeur TEXT,
    valeur_min DOUBLE PRECISION,
    valeur_max DOUBLE PRECISION
);