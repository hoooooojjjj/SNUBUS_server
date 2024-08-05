// 서버 코드 - API 데이터 요청 처리
const express = require("express");
const request = require("request");
require("dotenv").config();

const app = express();
const PORT = 8080;

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
  const { routeId } = req.query;
  const url = `http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid?ServiceKey=${API_KEY}&busRouteId=${routeId}&resultType=json`;

  request(url, (error, response, body) => {
    if (error) {
      return res.status(500).send("Error occurred while fetching bus data");
    }

    const parsedBody = JSON.parse(body);
    const headerMsg = parsedBody.msgHeader.headerMsg;

    if (headerMsg === "정상적으로 처리되었습니다.") {
      res.status(200).send(parsedBody.msgBody.itemList);
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
  const { routeId } = req.query;
  const url = `http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll?ServiceKey=${API_KEY}&busRouteId=${routeId}&resultType=json`;

  request(url, (error, response, body) => {
    if (error) {
      return res.status(500).send("Error occurred while fetching station data");
    }

    const parsedBody = JSON.parse(body);
    const headerMsg = parsedBody.msgHeader.headerMsg;

    if (headerMsg === "정상적으로 처리되었습니다.") {
      res.status(200).send(parsedBody.msgBody.itemList);
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
