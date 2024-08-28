// 서버 코드 - API 데이터 요청 처리
const express = require("express");
const request = require("request");
require("dotenv").config();
const cors = require("cors");

const app = express();
const PORT = 443;

app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:3000", "https://snubus.vercel.app"], // 여러 URL 허용
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.options(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://snubus.vercel.app"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

const allowedOrigins = ["http://localhost:3000", "https://snubus.vercel.app"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.get("/api/busData", (req, res) => {
  const { routeId, busClassification } = req.query;
  const url = `http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid?ServiceKey=${process.env.API_KEY}&busRouteId=${routeId}&resultType=json`;

  request(url, (error, response, body) => {
    if (error) {
      return res.status(500).send("Error occurred while fetching bus data");
    }

    const parsedBody = JSON.parse(body);
    const headerMsg = parsedBody.msgHeader.headerMsg;

    if (headerMsg === "정상적으로 처리되었습니다.") {
      const parsedBusClassification = JSON.parse(busClassification);
      const busData = parsedBody.msgBody.itemList;
      // 각 버스의 위치 좌표 리턴
      const getPosBuses = busData.map((bus) => [bus.gpsY, bus.gpsX]);

      // 각 버스의 정보 (버스 ID, 차량번호, 차량유형, 제공시간)
      const getBusInfo = busData.map((bus) => ({
        vehId: bus.vehId,
        plainNo: bus.plainNo,
        busType: bus.busType,
        dataTm: bus.dataTm,
      }));

      // 중앙대학교 방면 snubus 정류장 지나는 버스만 추출
      const busStationDirectionToStart = busData.filter(
        (busPos) =>
          parseInt(busPos.sectOrd) >=
            parsedBusClassification.NumberOfStations.start[0] &&
          parseInt(busPos.sectOrd) <=
            parsedBusClassification.NumberOfStations.start[1]
      );

      // 신림2동차고지 방면 snubus 정류장 지나는 버스만 출력
      const busStationDirectionToEnd = busData.filter(
        (busPos) =>
          parseInt(busPos.sectOrd) >=
            parsedBusClassification.NumberOfStations.end[0] &&
          parseInt(busPos.sectOrd) <=
            parsedBusClassification.NumberOfStations.end[1]
      );
      res.status(200).send({
        getPosBuses,
        getBusInfo,
        busStationDirectionToStart,
        busStationDirectionToEnd,
      });
    } else if (
      headerMsg.includes("LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS")
    ) {
      res.status(429).send("Too many requests, please try again later.");
    } else {
      res.status(503).send("No buses are currently in operation.");
    }
  });
});

app.get("/api/stationData", (req, res) => {
  const { routeId, busClassification } = req.query;

  const url = `http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll?ServiceKey=${process.env.API_KEY}&busRouteId=${routeId}&resultType=json`;

  request(url, (error, response, body) => {
    if (error) {
      return res.status(500).send("Error occurred while fetching station data");
    }

    const parsedBody = JSON.parse(body);
    const headerMsg = parsedBody.msgHeader.headerMsg;

    console.log(headerMsg);

    if (headerMsg === "정상적으로 처리되었습니다.") {
      const busStationData = parsedBody.msgBody.itemList;

      const parsedBusClassification = JSON.parse(busClassification);
      // 중앙대학교 방면 정류장들 관련 정보 필터링
      const busStationName_start = busStationData.filter(
        (busStationInfo, i) =>
          i >= parsedBusClassification.NumberOfStations.start[0] &&
          i <= parsedBusClassification.NumberOfStations.start[1]
      );

      // 신림2동차고지 방면 정류장들 관련 정보 필터링
      const busStationName_end = busStationData.filter(
        (busStationInfo, i) =>
          i >= parsedBusClassification.NumberOfStations.end[0] &&
          i <= parsedBusClassification.NumberOfStations.end[1]
      );

      res.status(200).send({ busStationName_start, busStationName_end });
    } else if (
      headerMsg.includes("LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS")
    ) {
      res.status(429).send("Too many requests, please try again later.");
    } else {
      res.status(503).send([]);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
