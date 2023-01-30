const express = require("express");
const multer = require("multer");
const cors = require("cors");
const pgp = require("pg-promise")();
const path = require("path");
const http = require("http");
const https = require("https");
const yup = require("yup");
const fs = require("fs");

const app = express();
const db = pgp("postgres://test:pass@localhost:5432/imageupload");

const random = () => Math.floor(Math.random() * 1000000);

const isUrl = (str) => yup.string().url().required().strict().isValidSync(str);

const makeFilename = (filename) => {
  const [extension] = filename.match(/\.[^\.]+$/g) || [];
  if (extension === undefined) {
    return "image-" + Date.now() + "-" + random() + ".png";
  }

  const name = filename.slice(0, -extension.length);

  return name + "-" + Date.now() + "-" + random() + extension;
};

const storage = multer.diskStorage({
  destination: "./images/",
  filename: (req, file, cb) => {
    const filename = makeFilename(file.originalname);
    cb(null, filename);
  },
});
const upload = multer({ storage });

app.use(cors());

const saveFileIfExists = async (req, res, next) => {
  const filename = req.files.bookCover && req.files.bookCover[0].filename;
  const { extraData } = req.body;

  if (!filename) {
    next();
    return;
  }

  await db.none(`
      insert into
        img (filename, extradata)
      values
        (
          $security$${filename}$security$,
          $security$${extraData}$security$
        );
    `);
  res.end();
};

const testUrlExists = async (req, res, next) => {
  const { bookCoverUrl } = req.body;

  if (!bookCoverUrl || !isUrl(bookCoverUrl)) {
    res.status(400).end();
    return;
  }

  next();
};

const getImageHttp = (bookCoverUrl, filename) => {
  http.get(
    bookCoverUrl,
    {
      headers: {
        "User-Agent": "SomeMan/1.0.0",
      },
    },
    (res) => {
      res.pipe(fs.createWriteStream("images/" + filename));
    }
  );
};

const getImageHttps = (bookCoverUrl, filename) => {
  https.get(
    bookCoverUrl,
    {
      headers: {
        "User-Agent": "SomeMan/1.0.0",
      },
    },
    (res) => {
      res.pipe(fs.createWriteStream("images/" + filename));
    }
  );
};

const downloadImage = async (req, res) => {
  const { extraData, bookCoverUrl } = req.body;
  const url = new URL(bookCoverUrl);
  let filename = url.pathname.match(/\/[^\/]+$/g)[0].slice(1);
  filename = makeFilename(filename);
  const protocol = url.protocol;

  try {
    if (protocol === "http:") getImageHttp(bookCoverUrl, filename);
    else if (protocol === "https:") getImageHttps(bookCoverUrl, filename);
    else {
      res.status(400).end();
      return;
    }
  } catch (e) {
    res.status(500).end();
  }

  await db.none(`
      insert into
        img (filename, extradata, imagelink)
      values
        (
          $security$${filename}$security$,
          $security$${extraData}$security$,
          $security$${bookCoverUrl}$security$
        );
    `);
  res.end();
};

app.post(
  "/",
  upload.fields([{ name: "bookCover", maxCount: 1 }]),
  saveFileIfExists,
  testUrlExists,
  downloadImage
);

app.get("/img/:image", (req, res) => {
  const { image } = req.params;

  const imagePath = path.resolve(__dirname, "images/" + image);

  res.sendFile(imagePath, {}, () => {
    res.status(404).end();
  });
});

app.listen(5000);
