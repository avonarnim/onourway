"use strict";
const router = require("express").Router();
const spot = require("./controllers/spotController");
const trip = require("./controllers/tripController");
const user = require("./controllers/userController");

// trip-user Routes
router.route("/api/trips/:tripId").get((req, res) => {
  trip.get_trip(req, res);
});
router.route("/api/trips").post((req, res) => {
  trip.create_trip(req, res);
});
router.route("/api/trips/:username/:tripId").post((req, res) => {
  trip.update_trip(req, res);
});
router.route("/api/trips/:username/:tripId").delete((req, res) => {
  trip.delete_trip(req, res);
});
router.route("/api/trips/:username/:tripId").put((req, res) => {
  user.save_trip_to_user(req, res);
});

// trip Routes
router.route("/api/trips/:tripId").get((req, res) => {
  trip.view_trip(req, res);
});

// spot Routes
router.route("/api/spots").get((req, res) => {
  spot.search_spots(req, res);
});
router.route("/api/spots").post((req, res) => {
  spot.insert_spot(req, res);
});
router.route("/api/spots/:spotId").post((req, res) => {
  spot.update_spot(req, res);
});
router.route("/api/spots").delete((req, res) => {
  spot.delete_spot(req, res);
});
router.route("/api/spots/:spotId").get((req, res) => {
  spot.view_spot(req, res);
});

// user Routes
router.route("/api/users").post((req, res) => {
  user.create_profile(req, res);
});
router.route("/api/users").get((req, res) => {
  user.list_users(req, res);
});
router.route("/api/users/:userId").get((req, res) => {
  user.get_profile(req, res);
});
router.route("/api/users/:userId").delete((req, res) => {
  user.delete_profile(req, res);
});
router.route("/api/users/follow/:userId/:followingId").put((req, res) => {
  user.add_user_to_following(req, res);
});
router.route("/api/users/unfollow/:userId/:followingId").put((req, res) => {
  user.remove_user_from_following(req, res);
});

module.exports = router;
