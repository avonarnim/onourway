"use strict";
const formidable = require("formidable");
const fs = require("fs");
const { storage } = require("../config/storage");

// The ID of your GCS bucket
const bucketName = "assets.road-tripper.vercel.app";

async function deleteFile(fileName) {
  const lastSubstr = fileName.slice(fileName.lastIndexOf("/") + 1);
  const exists = await storage.bucket(bucketName).file(lastSubstr).exists();
  if (exists) {
    await storage.bucket(bucketName).file(lastSubstr).delete();
    console.log(`${lastSubstr} deleted from ${bucketName}.`);
  }
  return;
}

async function uploadFile(contents, destFileName) {
  await storage.bucket(bucketName).file(destFileName).save(contents);
  console.log(`${destFileName} uploaded to ${bucketName}`);
  return;
}

// retrieve single user's profile with matching id
exports.upload_image = async function (req, res) {
  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    if (err) {
      console.error(err.message);
      res.send(err);
    }
    const file = Object.values(files)[0];
    const rawData = fs.readFileSync(file.filepath);

    if (fields.prevImage !== "")
      deleteFile(fields.prevImage).catch(console.error);
    uploadFile(rawData, fields.destFileName).catch(console.error);

    res.json({
      uploadUrl: `https://storage.cloud.google.com/${bucketName}/${fields.destFileName}`,
    });
  });
};
