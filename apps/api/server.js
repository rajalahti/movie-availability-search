require("dotenv").config();

const cors = require("cors");
const express = require("express");

const { searchMovie } = require("./searchMovie");
const { getSimilarMovies } = require("./getSimilarMovies");

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

const toEvent = (req) => ({
  queryStringParameters: Object.fromEntries(
    Object.entries(req.query).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(",") : String(value),
    ])
  ),
});

const sendLambdaStyleResponse = async (handler, req, res) => {
  try {
    const response = await handler(toEvent(req));
    const statusCode = response?.statusCode ?? 200;

    if (response?.headers) {
      Object.entries(response.headers).forEach(([name, value]) => {
        if (value !== undefined) {
          res.setHeader(name, value);
        }
      });
    }

    if (typeof response?.body === "string") {
      try {
        res.status(statusCode).json(JSON.parse(response.body));
        return;
      } catch {
        res.status(statusCode).send(response.body);
        return;
      }
    }

    res.status(statusCode).json(response?.body ?? {});
  } catch (error) {
    console.error("Unhandled API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/search", (req, res) => {
  void sendLambdaStyleResponse(searchMovie, req, res);
});

app.get("/similar", (req, res) => {
  void sendLambdaStyleResponse(getSimilarMovies, req, res);
});

app.listen(port, () => {
  console.log(`Movie API listening on http://localhost:${port}`);
});
