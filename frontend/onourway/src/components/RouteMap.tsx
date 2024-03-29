import {
  useJsApiLoader,
  GoogleMap,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Input,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useMutation } from "../core/api";
import { SpotInfoProps } from "./SpotInfo";
import { Dayjs } from "dayjs";
import { useAuth } from "../core/AuthContext";
import { EventProps } from "../pages/Event";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TripProps } from "../pages/EditTrip";
import { groupDetoursByDay } from "./DetourDayTabPanel";
import dayjs from "dayjs";
import { ChosenDetoursDisplay } from "./RouteMapComponents/ChosenDetoursDisplay";
import { BrowseEventsDisplay } from "./RouteMapComponents/BrowseEventsDisplay";
import { BrowseSpotsDisplay } from "./RouteMapComponents/BrowseSpotsDisplay";
import { RouteInfo } from "./RouteMapComponents/RouteInfo";
import { HeaderInfo } from "./RouteMapComponents/HeaderInfo";
import { GasStationProps } from "../pages/Gas";
import { GasStationInfo } from "./RouteMapComponents/GasStationInfo";
import { convertToLatLng } from "../core/util";

type Libraries = (
  | "drawing"
  | "geometry"
  | "localContext"
  | "places"
  | "visualization"
)[];
const libraries: Libraries = ["places"];

export function RouteMap(props: RouteMapProps): JSX.Element {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.REACT_APP_MAPS_KEY!,
    libraries: libraries,
  });

  const [map, setMap] = useState<google.maps.Map>();
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult>();

  const [oneWayRoundTrip, setOneWayRoundTrip] = useState(props.oneWayRoundTrip);
  const [center, setCenter] = useState({ lat: 37.8584, lng: -95.2945 });
  const [distance, setDistance] = useState("");
  const [cumulativeDistance, setCumulativeDistance] = useState(0);
  const [duration, setDuration] = useState("");
  const [cumulativeDuration, setCumulativeDuration] = useState(0);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const [chosenDetours, setChosenDetours] = useState<SpotInfoProps[]>(
    props.waypoints ?? []
  );
  const [tempChosenDetour, setTempChosenDetour] = useState<SpotInfoProps>();
  const [eventElements, setEventElements] = useState<JSX.Element[]>([]);
  const [routeCreated, setRouteCreated] = useState(false);

  const [startAutocomplete, setStartAutocomplete] =
    useState<google.maps.places.Autocomplete>();
  const [destinationAutocomplete, setDestinationAutocomplete] =
    useState<google.maps.places.Autocomplete>();

  const [savedSpots, setSavedSpots] = useState<SpotInfoProps[]>([]);
  const [savedEvents, setSavedEvents] = useState<EventProps[]>([]);
  const [savedGasStations, setSavedGasStations] = useState<GasStationProps[]>(
    []
  );
  const [originPlace, setOriginPlace] =
    useState<google.maps.places.PlaceResult>();
  const [destinationPlace, setDestinationPlace] =
    useState<google.maps.places.PlaceResult>();

  const hoursDrivingPerDay = 8;
  const [daysDriving, setDaysDriving] = useState(0);
  const [chosenDetoursByDay, setChosenDetoursByDay] = useState<
    SpotInfoProps[][]
  >([[]]);

  const [image, setImage] = useState<string>(props.tripResult?.image || "");
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setImage(event.target.value);
    } catch (err) {
      console.log("error handling change", err);
    }
  };

  const originRef = useRef<HTMLInputElement>();
  const destinationRef = useRef<HTMLInputElement>();

  const getSpotsInBox = useMutation("GetSpotsInBox");
  const getEventsInBoxTime = useMutation("GetEventsInBoxTime");
  const getGasStationsInBox = useMutation("GetGasStationsInBox");

  const getSpot = useMutation("GetSpot");

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

    if (
      navigator.geolocation &&
      !props.origin &&
      !props.destination &&
      !props.tripResult &&
      !props.tripId
    ) {
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

    // If this is a new trip, no far-away waypoints need to be retrieved.
    // There is sufficient information to calculate the route
    if (!props.tripId) {
      calculateRoute({ placeId: props.origin }, { placeId: props.destination });
    }
  },
  []);

  // If this is from a saved trip, then there may be some far-away waypoints that need to be retrieved
  useEffect(() => {
    if (
      map &&
      props.tripId &&
      props.tripResult?.originPlaceId &&
      props.tripResult?.destinationPlaceId &&
      props.tripResult?.waypoints !== undefined
    ) {
      retrieveSpotsAndCalculateRoute(props.tripResult.waypoints);
    }
  }, [map, props.tripResult]);

  const retrieveSpotsAndCalculateRoute = async (
    waypoints: { _id: string; [key: string]: any }[]
  ) => {
    // need to set chosen waypoints to the trip's waypoints
    let aggregatedDetours = [];
    for (const waypoint of waypoints) {
      const spot = await getSpot.commit({ spotId: waypoint._id });
      aggregatedDetours.push(spot);
    }
    setChosenDetours(aggregatedDetours);

    calculateRoute(
      { placeId: props.tripResult?.originPlaceId },
      { placeId: props.tripResult?.destinationPlaceId }
    );
  };

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
      // TODO: should evaluate if we need to fit bounds or not
      const bounds = new window.google.maps.LatLngBounds(
        originPlace?.geometry?.location,
        destinationPlace?.geometry?.location
      );
      map.fitBounds(bounds);
      loadSpots();
    }
  }, [originPlace, destinationPlace, startDate, endDate]);

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
    const originLocation = await convertToLatLng(map!, originValue);
    const destinationLocation = await convertToLatLng(map!, destinationValue);

    const directionsService = new google.maps.DirectionsService();
    const wayPoints: google.maps.DirectionsWaypoint[] = chosenDetours.map(
      (spot) => {
        return {
          location: {
            lat: spot.location.lat,
            lng: spot.location.lng,
          },
          stopover: true,
        };
      }
    );
    if (oneWayRoundTrip == "roundTrip") {
      wayPoints.push({
        location: destinationValue,
        stopover: true,
      });
      destinationValue = originValue;
    }

    const results = await directionsService.route({
      origin: originValue,
      destination: destinationValue,
      waypoints: wayPoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING,
    });
    setDirectionsResponse(results);
    const rawDistance = results.routes[0].legs.reduce(
      (acc, cur) => acc + (cur.distance?.value ?? 0),
      0
    );
    const rawDuration = results.routes[0].legs.reduce(
      (acc, cur) => acc + (cur.duration?.value ?? 0),
      0
    );
    setCumulativeDistance(rawDistance);
    setCumulativeDuration(rawDuration);
    setDistance(`${Math.floor((10 * rawDistance) / 1609.34) / 10} miles`);
    setDuration(
      `${Math.floor(rawDuration / 3600)} hours, ${Math.floor(
        (rawDuration - 3600 * Math.floor(rawDuration / 3600)) / 60
      )} mins`
    );
    setRouteCreated(true);
    const tempDaysDriving = Math.ceil(rawDuration / 3600 / hoursDrivingPerDay);
    setDaysDriving(tempDaysDriving);

    setChosenDetoursByDay(
      groupDetoursByDay(
        originLocation,
        originRef.current?.value || props.originVal,
        originPlace?.place_id ?? props.origin,
        destinationLocation,
        destinationRef.current?.value || props.destinationVal,
        destinationPlace?.place_id ?? props.destination,
        chosenDetours,
        tempDaysDriving,
        results,
        hoursDrivingPerDay
      )
    );

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

    const gasStationResults = await getGasStationsInBox.commit({
      longitude1: originPlace!.geometry!.location!.lng(),
      latitude1: originPlace!.geometry!.location!.lat(),
      longitude2: destinationPlace!.geometry!.location!.lng(),
      latitude2: destinationPlace!.geometry!.location!.lat(),
    });

    setSavedGasStations(gasStationResults);

    if (map) {
      const infoWindow = new google.maps.InfoWindow({ content: "" });

      const markers = spotResults.map((spot) => {
        const marker = new google.maps.Marker({
          position: {
            lat: spot.location.lat,
            lng: spot.location.lng,
          },
          map: map,
        });

        google.maps.event.addListener(marker, "click", () => {
          infoWindow.close();
          infoWindow.setContent(
            `<div>` +
              (spot.images.length > 0
                ? `<img src=${spot.images[0]} style="height:100px;"/>`
                : "") +
              `<h2 style="color:black;">${spot.title}</h2>
            <p style="color:black;">${spot.description}</p>
            <p style="color:black;">${spot.category}</p>
            <p style="color:black;">Quality: ${spot.quality}</p>
            <p style="color:black;">Specialty: ${spot.specialty}</p>
          </div>`
          );
          infoWindow.open(map, marker);
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
      <HeaderInfo
        currentUser={currentUser}
        image={image}
        handleImageChange={handleImageChange}
        name={props.tripResult?.name || "Name"}
        description={props.tripResult?.description || "Description"}
        startDate={
          props.startDate || startDate?.toString() || Date.now().toString()
        }
        endDate={props.endDate || endDate?.toString() || Date.now().toString()}
        cumulativeDistance={cumulativeDistance}
        cumulativeDuration={cumulativeDuration}
        clearRoute={clearRoute}
        originRef={originRef}
        destinationRef={destinationRef}
        originPlace={originPlace}
        destinationPlace={destinationPlace}
        chosenDetours={chosenDetours}
        tripCreatorId={props.tripResult?.creatorId}
        tripId={props.tripResult?._id || props.tripId || ""}
        setTripId={props.setTripId}
        completed={props.tripResult?.completed || false}
        posted={props.tripResult?.posted || false}
        oneWayRoundTrip={oneWayRoundTrip}
      />
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
          <ToggleButtonGroup
            value={oneWayRoundTrip}
            exclusive
            onChange={(event, newOneWayRoundTrip: "oneWay" | "roundTrip") =>
              setOneWayRoundTrip(newOneWayRoundTrip)
            }
            aria-label="outlined button group"
            sx={{ pl: 4, pt: 2 }}
          >
            <ToggleButton value="oneWay" aria-label="one way">
              One Way
            </ToggleButton>
            <ToggleButton value="roundTrip" aria-label="round trip">
              Round Trip
            </ToggleButton>
          </ToggleButtonGroup>
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
                    map?.setCenter({
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    });
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
                    map?.setCenter({
                      lat: place.geometry.location.lat(),
                      lng: place.geometry.location.lng(),
                    });
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
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid item container direction="row" xs={12}>
                <Grid item xs={6} sx={{ p: 4 }}>
                  <DatePicker
                    label="Start"
                    value={
                      startDate ||
                      dayjs(props.startDate) ||
                      dayjs(props.tripResult?.startDate) ||
                      dayjs()
                    }
                    onChange={(newValue) => setStartDate(newValue)}
                  />
                </Grid>
                <Grid item xs={6} sx={{ p: 4 }}>
                  <DatePicker
                    label="End"
                    value={
                      endDate ||
                      dayjs(props.endDate) ||
                      dayjs(props.tripResult?.endDate) ||
                      dayjs()
                    }
                    onChange={(newValue) => setEndDate(newValue)}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
            <br />
            <br />
            <br />
            <BrowseSpotsDisplay
              spots={savedSpots}
              addSpotToRoute={addSpotToRoute}
              map={map}
            />
            <BrowseEventsDisplay events={savedEvents} map={map} />
            <ChosenDetoursDisplay
              chosenDetours={chosenDetours}
              savedSpots={savedSpots}
              originRef={originRef}
              originPlace={originPlace}
              destinationRef={destinationRef}
              destinationPlace={destinationPlace}
              map={map}
              daysDriving={daysDriving}
              removeSpotFromRoute={removeSpotFromRoute}
              setChosenDetours={setChosenDetours}
            />

            <Grid container spacing={0} justifyContent="flex-begin">
              <Grid item xs={3} sx={{ p: 4 }}>
                <Button
                  type="submit"
                  onClick={() => {
                    if (
                      originPlace?.geometry?.location &&
                      destinationPlace?.geometry?.location
                    ) {
                      calculateRoute(
                        originPlace.geometry?.location,
                        destinationPlace.geometry?.location
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

            <RouteInfo
              routeCreated={routeCreated}
              distance={distance}
              duration={duration}
              daysDriving={daysDriving}
              chosenDetoursByDay={chosenDetoursByDay}
              startDate={startDate}
              endDate={endDate}
            />
            <GasStationInfo stations={savedGasStations} />
          </Grid>
        </Box>
      </Box>
    </>
  ) : (
    <></>
  );
}

export type RouteMapProps = {
  oneWayRoundTrip: "oneWay" | "roundTrip";
  origin: string;
  originVal: string;
  destination: string;
  destinationVal: string;
  startDate?: string;
  endDate?: string;
  tripId?: string;
  setTripId: (tripId: string) => void;
  tripResult?: TripProps;
  waypoints?: SpotInfoProps[];
};
