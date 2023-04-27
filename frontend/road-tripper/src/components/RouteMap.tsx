import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import React, { useRef, useState, createRef, useEffect } from "react";
import {
  Box,
  Button,
  Grid,
  Input,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  ListItemButton,
  Paper,
  ListItemIcon,
} from "@mui/material";
import { useMutation } from "../core/api";
import {
  NearMe,
  Delete,
  Add,
  Restaurant,
  Hiking,
  Museum,
  Event,
  Celebration,
  ArrowRight,
} from "@mui/icons-material";
import { SpotInfoProps } from "./SpotInfo";
import { Dayjs } from "dayjs";
import { useAuth } from "../core/AuthContext";
import { Link } from "react-router-dom";
import { EventProps } from "../pages/Event";

type Libraries = (
  | "drawing"
  | "geometry"
  | "localContext"
  | "places"
  | "visualization"
)[];
const libraries: Libraries = ["places"];

function categoryToIcon(category: string) {
  console.log(category);
  switch (category) {
    case "Restaurant":
    case "Dining":
      return <Restaurant />;
    case "Nature":
    case "Hiking":
      return <Hiking />;
    case "History":
    case "Museum":
      return <Museum />;
    case "Concert":
    case "Event":
    case "Venue":
      return <Event />;
    case "Party":
    case "Celebration":
      return <Celebration />;
    default:
      return <ArrowRight />;
  }
}

export function RouteMap(props: RouteMapProps): JSX.Element {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_MAPS_KEY!,
    libraries: libraries,
  });

  const [map, setMap] = useState<google.maps.Map>();
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult>();
  const [center, setCenter] = useState({ lat: 38.8584, lng: -112.2945 });
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [chosenDetours, setChosenDetours] = useState<SpotInfoProps[]>([]);
  const [tempChosenDetour, setTempChosenDetour] = useState<SpotInfoProps>();
  const [wayPointElements, setWayPointElements] = useState<JSX.Element[]>([]);
  const [eventElements, setEventElements] = useState<JSX.Element[]>([]);
  const [routeCreated, setRouteCreated] = useState(false);
  const [startAutocomplete, setStartAutocomplete] =
    useState<google.maps.places.Autocomplete>();
  const [destinationAutocomplete, setDestinationAutocomplete] =
    useState<google.maps.places.Autocomplete>();
  const [savedSpots, setSavedSpots] = useState<SpotInfoProps[]>([]);
  const [savedEvents, setSavedEvents] = useState<EventProps[]>([]);
  const [originPlace, setOriginPlace] =
    useState<google.maps.places.PlaceResult>();
  const [destinationPlace, setDestinationPlace] =
    useState<google.maps.places.PlaceResult>();

  const hoursDrivingPerDay = 8;
  const [daysDriving, setDaysDriving] = useState(1);
  const [chosenDetoursByDay, setChosenDetoursByDay] = useState<
    SpotInfoProps[][]
  >([[]]);

  const originRef = useRef<HTMLInputElement>();
  const destinationRef = useRef<HTMLInputElement>();
  const nameRef = useRef<HTMLInputElement>();

  const getSpotsInBox = useMutation("GetSpotsInBox");
  const getEventsInBoxTime = useMutation("GetEventsInBoxTime");
  const createTrip = useMutation("CreateTrip");

  const { currentUser } = useAuth();

  // called on-start up of the page
  const onLoad = React.useCallback(async function callback(
    map: google.maps.Map
  ) {
    const options = {
      restriction: {
        latLngBounds: {
          north: 85,
          south: -85,
          west: -179,
          east: 179,
        },
        strictBounds: true,
      },
    };
    map.setOptions(options);

    if (navigator.geolocation && !props.origin && !props.destination) {
      navigator.geolocation.getCurrentPosition(success, error);
    }

    setMap(map);

    const placesDetailsService = new google.maps.places.PlacesService(map);
    placesDetailsService.getDetails(
      { placeId: props.origin, fields: ["geometry"] },
      (place, status) => {
        if (place) {
          place.place_id = props.origin;
          setOriginPlace(place);
        } else {
          console.log(status);
        }
      }
    );
    placesDetailsService.getDetails(
      { placeId: props.destination, fields: ["geometry"] },
      (place, status) => {
        if (place) {
          place.place_id = props.destination;
          setDestinationPlace(place);
        } else {
          console.log(status);
        }
      }
    );

    calculateRoute({ placeId: props.origin }, { placeId: props.destination });
  },
  []);

  // Called once the map is loaded
  useEffect(() => {
    if (
      map &&
      originPlace &&
      destinationPlace &&
      originPlace.geometry &&
      destinationPlace.geometry &&
      originPlace.geometry.location &&
      destinationPlace.geometry.location
    ) {
      loadSpots();
    }
  }, [originPlace, destinationPlace]);

  // upon success of finding the user's location, set the center of the map to that location
  function success(position: GeolocationPosition) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    setCenter({ lat: latitude, lng: longitude });
    map?.panTo(center);
    map?.setZoom(4);
  }

  // if the user's location cannot be found, set the center of the map to the continental US
  function error() {
    console.log("Unable to retrieve your location");
  }

  // called when the user clicks on "Calculate Route"
  async function calculateRoute(
    originValue:
      | string
      | google.maps.LatLng
      | google.maps.Place
      | google.maps.LatLngLiteral,
    destinationValue:
      | string
      | google.maps.LatLng
      | google.maps.Place
      | google.maps.LatLngLiteral
  ) {
    const directionsService = new google.maps.DirectionsService();
    const wayPoints = chosenDetours.map((spot) => {
      return {
        location: {
          lat: spot.location.lat,
          lng: spot.location.lng,
        },
        stopover: true,
      };
    });
    const results = await directionsService.route({
      origin: originValue,
      destination: destinationValue,
      waypoints: wayPoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    });
    setDirectionsResponse(results);
    const cumulativeDistance = results.routes[0].legs.reduce(
      (acc, cur) => acc + (cur.distance?.value ?? 0),
      0
    );
    const cumulativeDuration = results.routes[0].legs.reduce(
      (acc, cur) => acc + (cur.duration?.value ?? 0),
      0
    );
    setDistance(
      `${Math.floor((10 * cumulativeDistance) / 1609.34) / 10} miles`
    );
    setDuration(
      `${Math.floor(cumulativeDuration / 3600)} hours, ${Math.floor(
        (cumulativeDuration - 3600 * Math.floor(cumulativeDuration / 3600)) / 60
      )} mins`
    );
    setRouteCreated(true);
    setDaysDriving(Math.ceil(cumulativeDuration / 3600 / hoursDrivingPerDay));
    // // set chosen detours by day to be an array of arrays of length daysDriving
    // // each array will contain the detours for that day
    // let detoursByDay: SpotInfoProps[][] = [];
    // for (let i = 0; i < daysDriving; i++) {
    //   detoursByDay.push([]);
    // }
    // // add each detour to the day it is closest to
    // chosenDetours.forEach((detour) => {
    //   let closestDay = 0;
    //   let closestDistance = Number.MAX_VALUE;
    //   for (let i = 0; i < daysDriving; i++) {
    //     const distance = Math.abs(
    //       detour.location.lng - results.routes[0].legs[i].end_location.lng()
    //     );
    //     if (distance < closestDistance) {
    //       closestDay = i;
    //       closestDistance = distance;
    //     }
    //   }
    //   detoursByDay[closestDay].push(detour);
    // });
    // setChosenDetoursByDay(chosenDetoursByDay);
    return;
  }

  // clears the route from the map
  function clearRoute() {
    setDirectionsResponse(undefined);
    setDistance("");
    setDuration("");
    setRouteCreated(false);
    if (originRef.current && destinationRef.current) {
      originRef.current.value = "";
      destinationRef.current.value = "";
    }
  }

  // helper function for updating the chosen detours
  // required because of the way the original rendering of waypoint options works
  useEffect(() => {
    if (tempChosenDetour) {
      setChosenDetours([...chosenDetours, tempChosenDetour]);
    }
  }, [tempChosenDetour]);

  function addSpotToRoute(spot: SpotInfoProps) {
    setTempChosenDetour(spot);
  }

  function removeSpotFromRoute(index: number) {
    const newDetours = chosenDetours.filter((detour, i) => i !== index);
    setChosenDetours(newDetours);
  }

  // finds ~10 random spots within the bounding box of the route
  function generateRandomRoute() {
    console.log("generateRandomRoute");

    if (
      originPlace &&
      originPlace.geometry &&
      originPlace.geometry.location &&
      destinationPlace &&
      destinationPlace.geometry &&
      destinationPlace.geometry.location
    ) {
      const lat1 = originPlace.geometry.location.lat();
      const lng1 = originPlace.geometry.location.lng();
      const lat2 = destinationPlace.geometry.location.lat();
      const lng2 = destinationPlace.geometry.location.lng();

      const inRange = savedSpots.filter((spot) => {
        const insideLat =
          (spot.location.lat > lat1 && spot.location.lat < lat2) ||
          (spot.location.lat < lat1 && spot.location.lat > lat2);
        const insideLng =
          (spot.location.lng > lng1 && spot.location.lng < lng2) ||
          (spot.location.lng < lng1 && spot.location.lng > lng2);
        return insideLat && insideLng;
      });

      const idealNumberOfSpots = daysDriving * 4;
      const necessaryProbability = idealNumberOfSpots / inRange.length;

      const randomChoice = inRange
        .filter((spot) => {
          return Math.random() > necessaryProbability;
        })
        .slice(0, idealNumberOfSpots);

      setChosenDetours(randomChoice);
    }
  }

  // called once originPlace and destinationPlace lat/lng data is available
  // pulls spots from within reasonable range and renders
  async function loadSpots() {
    const spotResults = await getSpotsInBox.commit({
      longitude1: originPlace!.geometry!.location!.lng(),
      latitude1: originPlace!.geometry!.location!.lat(),
      longitude2: destinationPlace!.geometry!.location!.lng(),
      latitude2: destinationPlace!.geometry!.location!.lat(),
    });

    setSavedSpots(spotResults);

    const eventResults = await getEventsInBoxTime.commit({
      longitude1: originPlace!.geometry!.location!.lng(),
      latitude1: originPlace!.geometry!.location!.lat(),
      longitude2: destinationPlace!.geometry!.location!.lng(),
      latitude2: destinationPlace!.geometry!.location!.lat(),
      startTime: props.startDate ?? new Date().toISOString(),
      endTime: props.endDate ?? new Date().toISOString(),
    });

    setSavedEvents(eventResults);

    const eventElementsWithRefs = eventResults.map(
      (eventResult: EventProps) => {
        const eventRef = createRef<HTMLDivElement>();

        const element = (
          <ListItem
            key={eventResult.title + eventResult._id}
            // secondaryAction={
            //   <IconButton edge="end" onClick={() => addEventToRoute(eventResult)}>
            //     <Add />
            //   </IconButton>
            // }
          >
            <ListItemButton
              onClick={() => {
                map!.setCenter(eventResult.location);
                map!.setZoom(10);
              }}
            >
              <ListItemText
                ref={eventRef}
                primary={eventResult.title}
                secondary={eventResult.description}
              ></ListItemText>
            </ListItemButton>
          </ListItem>
        );
        return {
          event: { eventResult, eventRef },
          element,
        };
      }
    );

    const eventElements = eventElementsWithRefs.map((event) => event.element);
    const eventsWithRefs = eventElementsWithRefs.map((event) => event.event);

    setEventElements(
      eventElements.length > 0
        ? eventElements
        : [<ListItem>No events are available during this time</ListItem>]
    );

    const wayPointsWithRefs = spotResults.map((spotResult: SpotInfoProps) => {
      const waypointRef = createRef<HTMLDivElement>();

      console.log("spotResult", spotResult.title, spotResult.category);
      const element = (
        <ListItem
          key={
            spotResult.title +
            spotResult._id +
            spotResult.location.lat +
            spotResult.location.lng
          }
          secondaryAction={
            <IconButton edge="end" onClick={() => addSpotToRoute(spotResult)}>
              <Add />
            </IconButton>
          }
        >
          <ListItemButton
            onClick={() => {
              map!.setCenter(spotResult.location);
              map!.setZoom(10);
            }}
          >
            <ListItemIcon>{categoryToIcon(spotResult.category)}</ListItemIcon>
            <ListItemText
              ref={waypointRef}
              primary={spotResult.title}
              secondary={spotResult.description}
            ></ListItemText>
          </ListItemButton>
        </ListItem>
      );
      return {
        spot: { spotResult, waypointRef },
        element,
      };
    });

    const elements = wayPointsWithRefs.map((wayPoint) => wayPoint.element);
    const spotsWithRefs = wayPointsWithRefs.map((wayPoint) => wayPoint.spot);

    setWayPointElements(elements);

    if (map) {
      const markers = spotsWithRefs.map((spot) => {
        const infoWindow = new google.maps.InfoWindow({
          content: `<div>
              <h2 style="color:black;">${spot.spotResult.title}</h2>
              <p style="color:black;">${spot.spotResult.description}</p>
              <p style="color:black;">${spot.spotResult.category}</p>
              <p style="color:black;">Quality: ${spot.spotResult.quality}</p>
              <p style="color:black;">Specialty: ${spot.spotResult.specialty}</p>
            </div>`,
        });

        const marker = new google.maps.Marker({
          position: {
            lat: spot.spotResult.location.lat,
            lng: spot.spotResult.location.lng,
          },
          map: map,
        });

        marker.addListener("click", () => {
          infoWindow.open({ anchor: marker, map });
          // scrollToMarkerElement(spot.waypointRef);
        });

        return marker;
      });

      new MarkerClusterer({ map, markers });
    }
  }

  function scrollToMarkerElement(markerRef: React.RefObject<HTMLDivElement>) {
    if (markerRef.current) {
      markerRef.current.scrollIntoView();
    }
  }

  const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
    setMap(undefined);
  }, []);

  return isLoaded ? (
    <>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "500px" }}
        center={center}
        zoom={4}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {directionsResponse && (
          <DirectionsRenderer directions={directionsResponse} />
        )}
      </GoogleMap>
      <Box>
        <Box>
          <Grid item container direction="row" alignItems="center">
            <Grid item xs={6} sx={{ p: 4 }}>
              <Autocomplete
                fields={["formatted_address", "name", "geometry", "place_id"]}
                onLoad={(autocomplete) => setStartAutocomplete(autocomplete)}
                onPlaceChanged={() => {
                  const place = startAutocomplete?.getPlace();
                  if (!place || !place.geometry || !place.geometry.location) {
                    return;
                  } else {
                    setOriginPlace(place);
                    map?.setCenter(place.geometry.location);
                    map?.setZoom(10);
                  }
                }}
              >
                <Input
                  type="text"
                  defaultValue={props.originVal}
                  inputRef={originRef}
                  fullWidth
                />
              </Autocomplete>
            </Grid>
            <Grid item xs={6} sx={{ p: 4 }}>
              <Autocomplete
                fields={["formatted_address", "name", "geometry", "place_id"]}
                onLoad={(autocomplete) =>
                  setDestinationAutocomplete(autocomplete)
                }
                onPlaceChanged={() => {
                  const place = destinationAutocomplete?.getPlace();
                  if (!place || !place.geometry || !place.geometry.location) {
                    return;
                  } else {
                    setDestinationPlace(place);
                    map?.setCenter(place.geometry.location);
                    map?.setZoom(10);
                  }
                }}
              >
                <Input
                  type="text"
                  defaultValue={props.destinationVal}
                  inputRef={destinationRef}
                  fullWidth
                />
              </Autocomplete>
            </Grid>
            <br />
            <br />
            <br />
            <Grid
              item
              container
              direction="column"
              xs={12}
              sm={6}
              md={4}
              sx={{ p: 4 }}
            >
              <Grid item>
                <Typography>Browse Stops</Typography>
              </Grid>
              <Grid item>
                <Paper style={{ height: 300, overflow: "auto" }}>
                  <List dense sx={{ width: "100%" }}>
                    {wayPointElements.length === 0 ? (
                      <ListItem>Loading...</ListItem>
                    ) : (
                      wayPointElements
                    )}
                  </List>
                </Paper>
              </Grid>
            </Grid>
            <Grid
              item
              container
              direction="column"
              xs={12}
              sm={6}
              md={4}
              sx={{ p: 4 }}
            >
              <Grid item>
                <Typography>Browse Events</Typography>
              </Grid>
              <Grid item>
                <Paper style={{ height: 300, overflow: "auto", maxWidth: 360 }}>
                  <List dense sx={{ width: "100%" }}>
                    {eventElements.length === 0 ? (
                      <ListItem>Loading...</ListItem>
                    ) : (
                      eventElements
                    )}
                  </List>
                </Paper>
              </Grid>
            </Grid>
            <Grid
              item
              container
              direction="column"
              xs={12}
              sm={6}
              md={4}
              sx={{ p: 4 }}
            >
              <Grid item>
                <Typography>Selected Detours</Typography>
              </Grid>
              <Grid item>
                <Paper style={{ height: 300, overflow: "auto", maxWidth: 360 }}>
                  {chosenDetours.length === 0 &&
                  originRef.current?.value === "" &&
                  destinationRef.current?.value === "" ? (
                    <Box sx={{ p: 2 }}>
                      <Typography>No detours selected</Typography>
                      <Typography>
                        Enter an origin and destination to get recommendations
                      </Typography>
                    </Box>
                  ) : chosenDetours.length === 0 ? (
                    <Box sx={{ p: 2 }}>
                      <Typography>No detours selected</Typography>
                      <Button onClick={generateRandomRoute}>
                        Choose for me
                      </Button>
                    </Box>
                  ) : (
                    <List
                      dense
                      sx={{
                        width: "100%",
                      }}
                    >
                      {chosenDetours.map((detour, index) => {
                        console.log("mapping", index, detour.title);
                        return (
                          <ListItem
                            key={detour._id}
                            secondaryAction={
                              <IconButton
                                edge="end"
                                aria-label="comments"
                                onClick={() => removeSpotFromRoute(index)}
                              >
                                <Delete />
                              </IconButton>
                            }
                          >
                            <ListItemButton
                              onClick={() => {
                                map?.setCenter(detour.location);
                                map?.setZoom(10);
                              }}
                            >
                              <ListItemIcon>
                                {categoryToIcon(detour.category)}
                              </ListItemIcon>
                              <ListItemText
                                primary={detour.title}
                                secondary={detour.description}
                              ></ListItemText>
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={0} justifyContent="flex-begin">
              <Grid item xs={3} sx={{ p: 4 }}>
                <Button
                  type="submit"
                  onClick={() => {
                    if (
                      originRef.current?.value &&
                      destinationRef.current?.value
                    ) {
                      calculateRoute(
                        originRef.current?.value,
                        destinationRef.current?.value
                      );
                    } else {
                      alert("Please enter an origin and destination");
                    }
                  }}
                  variant="contained"
                >
                  Calculate Route
                </Button>
              </Grid>
            </Grid>

            {routeCreated ? (
              <>
                <Grid item xs={6} sx={{ pl: 4, pr: 4 }}>
                  <Typography>Distance: {distance} </Typography>
                </Grid>
                <Grid item xs={6} sx={{ pl: 4, pr: 4 }}>
                  <Typography>Duration: {duration} </Typography>
                </Grid>
              </>
            ) : (
              <></>
            )}

            {/* <Grid item xs={6} sx={{ pl: 4, pr: 4 }}>
              <IconButton
                aria-label="center back"
                onClick={() => {
                  map?.panTo(center);
                  map?.setZoom(4);
                }}
              >
                <NearMe />
              </IconButton>
            </Grid> */}
            <Grid item xs={6} sx={{ pl: 4, pr: 4 }}>
              {currentUser ? (
                <>
                  <Input type="text" placeholder="Name" inputRef={nameRef} />
                  <Button
                    onClick={() => {
                      createTrip.commit({
                        name: nameRef.current?.value || "Unnamed Trip",
                        description: "",
                        creatorId: currentUser.uid,
                        originPlaceId: originPlace?.place_id || "",
                        originVal: originRef.current?.value || "",
                        destinationPlaceId: destinationPlace?.place_id || "",
                        destinationVal: destinationRef.current?.value || "",
                        waypoints: chosenDetours.map((spot) => {
                          return {
                            _id: spot._id,
                            place_id: spot.place_id,
                            location: {
                              lat: spot.location.lat,
                              lng: spot.location.lng,
                            },
                            stopover: true,
                          };
                        }),
                        startDate: props.startDate || Date.now().toString(),
                        endDate: props.startDate || Date.now().toString(),
                        isPublic: false,
                        isComplete: false,
                        isArchived: false,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Link to={`/login`} style={{ textDecoration: "none" }}>
                  <Button>Log in to save your trip</Button>
                </Link>
              )}

              <IconButton aria-label="delete route" onClick={clearRoute}>
                <Delete />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </>
  ) : (
    <></>
  );
}

export type RouteMapProps = {
  origin: string;
  originVal: string;
  destination: string;
  destinationVal: string;
  startDate?: string;
  endDate?: string;
};
