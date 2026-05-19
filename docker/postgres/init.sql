CREATE TABLE unis (
  id serial PRIMARY KEY,
  title varchar(255),
  address varchar(255),
  "desc" varchar(255),
  lat double precision,
  long double precision,
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE grade_cs (
  id serial PRIMARY KEY,
  uni_id integer,
  cdepts_id integer,
  rate varchar(255),
  year varchar(255),
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE businesses (
  id serial PRIMARY KEY,
  cdepts_id integer,
  lat double precision,
  long double precision,
  title varchar(255),
  address varchar(255),
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE cbps (
  id serial PRIMARY KEY,
  total_indus double precision,
  total_anual double precision,
  cnaic integer,
  cnaic_name varchar(255),
  county integer,
  num_est integer,
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE muns (
  id serial PRIMARY KEY,
  title varchar(255),
  county integer,
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE cdepts (
  id serial PRIMARY KEY,
  cnaic integer,
  created_at timestamp,
  updated_at timestamp
);

INSERT INTO unis (id, title, address, "desc", lat, long, created_at, updated_at)
VALUES (1, 'Contract University', '100 Contract Ave', 'Seeded university row', 18.42, -66.06, NOW(), NOW());

INSERT INTO grade_cs (id, uni_id, cdepts_id, rate, year, created_at, updated_at)
VALUES (1, 1, 1, '92', '2016', NOW(), NOW());

INSERT INTO businesses (id, cdepts_id, lat, long, title, address, created_at, updated_at)
VALUES (1, 1, 18.41, -66.05, 'Contract Business', '200 Contract St', NOW(), NOW());

INSERT INTO cbps (id, total_indus, total_anual, cnaic, cnaic_name, county, num_est, created_at, updated_at)
VALUES (1, 10.5, 20.5, 541, 'Professional Services', 1, 3, NOW(), NOW());

INSERT INTO muns (id, title, county, created_at, updated_at)
VALUES (1, 'Contract Municipality', 1, NOW(), NOW());

INSERT INTO cdepts (id, cnaic, created_at, updated_at)
VALUES (1, 541, NOW(), NOW());

SELECT setval('unis_id_seq', 1, true);
SELECT setval('grade_cs_id_seq', 1, true);
SELECT setval('businesses_id_seq', 1, true);
SELECT setval('cbps_id_seq', 1, true);
SELECT setval('muns_id_seq', 1, true);
SELECT setval('cdepts_id_seq', 1, true);
