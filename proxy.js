// cors 에러 해결을 위한 프록시 서버 구축

const express = require("express");
const request = require("request");
const cors = require("cors");

const app = express();
const PORT = 8080;

// CORS를 허용할 URL 리스트
const allowedUrls = [
  "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid",
  "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll",
];

// 모든 요청에 대해 실행되는 미들웨어를 추가
app.use((req, res, next) => {
  const origin = req.headers.origin; // 요청의 Origin 헤더를 가져오기
  const url = req.query.url; // 요청의 쿼리 매개변수에서 'url'을 가져오기

  // 요청된 URL이 허용된 URL 목록에 있는지 확인
  if (allowedUrls.includes(url.split("?")[0])) {
    // URL의 기본 경로와 일치하는지 확인
    res.header("Access-Control-Allow-Origin", origin); // 요청의 Origin 헤더를 Access-Control-Allow-Origin 헤더로 설정
    res.header(
      "Access-Control-Allow-Methods",
      "GET,HEAD,PUT,PATCH,POST,DELETE"
    ); // 허용되는 HTTP 메서드를 설정
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    ); // 허용되는 요청 헤더를 설정
  }
  next(); // 다음 미들웨어로 제어를 전달
});

// 프록시 엔드포인트를 정의
app.get("/proxy", (req, res) => {
  const url = req.query.url; // 쿼리 매개변수에서 'url'을 가져오기
  if (!url) {
    // URL이 제공되지 않았으면
    return res.status(400).send("URL is required"); // 400 상태 코드와 함께 오류 메시지를 반환
  }

  // console.log(`Fetching URL: ${url}`); // 요청된 URL을 콘솔에 출력

  // request 모듈을 사용하여 원격 서버에 요청을 보내기
  request(
    { url, headers: { "User-Agent": "request" } },
    (error, response, body) => {
      if (error) {
        // 요청 중 오류가 발생하면
        console.error("Error occurred:", error); // 오류를 콘솔에 출력하고
        return res.status(500).send("Error occurred while fetching the URL"); // 500 상태 코드와 함께 오류 메시지를 반환
      }

      // 버스 위치 정보 요청이면
      if (
        req.query.url.includes(
          "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid"
        )
      ) {
        console.log(
          "버스 위치 데이터 : " + JSON.parse(body).msgHeader.headerMsg
        );
        // 에러처리
        switch (JSON.parse(body).msgHeader.headerMsg) {
          case "Key인증실패: LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR.[인증모듈 에러코드(22)]":
            // 데이터 요청 횟수 초과시 429 에러
            res.status(429).send("Too many requests, please try again later.");
            break;
          // 운행 중인 버스가 없다면 503 에러
          case "결과가 없습니다.":
            res.status(503).send([]);
            break;
          case "정상적으로 처리되었습니다.":
            // 정상적으로 처리되면
            // 버스 정보들 가공해서 send
            res.status(200).send(JSON.parse(body).msgBody.itemList);
            break;
          default:
            break;
        }
      }

      // 버스도착정보 데이터(정류장 관련 정보 데이터) 요청이면
      if (
        req.query.url.includes(
          "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll"
        )
      ) {
        // 에러처리
        switch (JSON.parse(body).msgHeader.headerMsg) {
          case "Key인증실패: LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR.[인증모듈 에러코드(22)]":
            // 데이터 요청 횟수 초과시 429 에러
            res.status(429).send("Too many requests, please try again later.");
            break;
          case "정상적으로 처리되었습니다.":
            // 정상적으로 처리되면
            // 정류장 관련 정보 배열 send
            res.status(200).send(JSON.parse(body).msgBody.itemList);
            break;
          default:
            break;
        }
      }
    }
  );
});

app.listen(PORT, () => {
  console.log(`CORS proxy server running on port ${PORT}`);
});
