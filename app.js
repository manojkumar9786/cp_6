const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");

app.use(express.json());

let db = null;

const initializationDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server Running`);
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializationDBAndServer();

const convertStateObjectResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const reportSnakeToCamelCase = (newObject) => {
  return {
    totalCases: newObject.cases,
    totalCured: newObject.cured,
    totalActive: newObject.active,
    totalDeaths: newObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStateQuery = `
    SELECT * FROM
    state;`;
  const states = await db.all(getStateQuery);
  response.send(states);
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateIdQuery = `
    SELECT * FROM
    state
    WHERE state_id = ${stateId};`;
  const state = await db.get(getStateIdQuery);
  response.send(state);
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
    INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
    VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
  const addDistrict = await db.run(postDistrictQuery);
  //const districtId = addDistrict.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `
    SELECT * FROM
    district
    WHERE district_id = ${districtId};`;
  const districts = await db.get(getDistrict);
  response.send(districts);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
    DELETE  FROM
    district
    WHERE district_id = ${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistricts = `
    UPDATE district
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE district_id = ${districtId};`;
  await db.run(updateDistricts);
  response.send(`District Details Updated`);
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const totalStates = `
    SELECT SUM(cases) AS cases,
    SUM(cured) AS cured,
    SUM(active) AS active,
    SUM(deaths) AS deaths
    FROM district
    WHERE state_id = ${stateId};`;
  const totals = await db.get(totalStates);
  const resultReport = reportSnakeToCamelCase(totals);
  response.send(resultReport);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDetailsQuery = `
    SELECT state_name FROM
    state INNER JOIN district ON state.state.state_id = district.state_id
    WHERE district.district_id = ${districtId};`;
  const detail = db.get(getDetailsQuery);
  response.send({ stateName: detail.state_name });
});

module.exports = app;
