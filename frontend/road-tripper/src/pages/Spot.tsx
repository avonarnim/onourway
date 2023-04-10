import { useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useMutation } from "../core/api";
import { SpotInfoProps } from "../components/SpotInfo";
import {
  Box,
  Container,
  Grid,
  Typography,
  CircularProgress,
} from "@mui/material";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";

type Libraries = (
  | "drawing"
  | "geometry"
  | "localContext"
  | "places"
  | "visualization"
)[];
const libraries: Libraries = ["places"];

export default function Spot(): JSX.Element {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_MAPS_KEY!,
    libraries: libraries,
  });

  const params = useParams();
  const [spotId, setSpotId] = useState("");
  const [map, setMap] = useState<google.maps.Map>();
  const [spot, setSpot] = useState<SpotInfoProps>();

  const getSpot = useMutation("GetSpot");

  useEffect(() => {
    console.log("params", params);
    if (!params.spotId) {
      console.log("no spot id");
    } else {
      console.log("getting spot");
      setSpotId(params.spotId);
      getSpotCallback(params.spotId);
    }
  }, [map]);

  const getSpotCallback = async (spotId: string) => {
    const getSpotResponse = await getSpot.commit({ spotId: spotId });
    setSpot(getSpotResponse);
    console.log("spot set", getSpotResponse);
    const marker = new google.maps.Marker({
      position: getSpotResponse.location,
      map: map,
    });

    map?.setOptions({
      zoom: 8,
      center: {
        lat: getSpotResponse.location.lat,
        lng: getSpotResponse.location.lng,
      },
    });
  };

  // called on-start up of the page
  const onLoad = React.useCallback(async function callback(
    map: google.maps.Map
  ) {
    setMap(map);
  },
  []);

  return spot ? (
    <Container sx={{ marginTop: 4 }}>
      <Box>
        <Grid item container sx={{ marginBottom: 4 }}>
          <Grid item xs={12} sm={6}>
            <img
              src={spot.image}
              alt={spot.title}
              style={{ borderRadius: "25px", width: "200px", height: "auto" }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography>{spot.title}</Typography>
            <Typography>{spot.description}</Typography>
            <Typography>Category: {spot.category}</Typography>
            {spot.featuredBy.length > 0 ? (
              <Typography>Featured by: {spot.featuredBy}</Typography>
            ) : (
              <></>
            )}
            {spot.highlightedIn.length > 0 ? (
              <Typography>Highlighted in {spot.highlightedIn}</Typography>
            ) : (
              <></>
            )}
            <Typography>Specialty: {spot.specialty}</Typography>
            <Typography>Quality: {spot.quality}</Typography>
            <Typography>Ratings: {spot.numberOfRatings}</Typography>
            <Typography>
              Average time spent here: {spot.avgTimeSpent}
            </Typography>
            <Typography>Cost: {swapToDollarSigns(spot.cost)}</Typography>
          </Grid>
        </Grid>

        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "500px" }}
            center={spot.location}
            zoom={4}
            onLoad={(map) => setMap(map)}
            onUnmount={() => setMap(undefined)}
          ></GoogleMap>
        ) : (
          <></>
        )}
        {/* TODO:
        if it's a venue featuredBy TicketMaster, find all upcoming events (do query)
        add "review" button 
        add "save to My Spots" button */}
      </Box>
    </Container>
  ) : (
    <Container>
      <Box>
        <CircularProgress />
      </Box>
    </Container>
  );
}

function swapToDollarSigns(cost: number): string {
  let dollarSigns = "";
  for (let i = 0; i < cost; i++) {
    dollarSigns += "$";
  }
  return dollarSigns;
}
