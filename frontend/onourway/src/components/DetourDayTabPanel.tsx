import React, { useState } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { SpotInfoProps } from "./SpotInfo";
import { categoryToIcon } from "../core/util";
import { Dayjs } from "dayjs";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

export function groupDetoursByDay(
  originValue: google.maps.LatLng,
  originName: string,
  originId: string,
  destinationValue: google.maps.LatLng,
  destinationName: string,
  destinationId: string,
  chosenDetours: SpotInfoProps[],
  tempDaysDriving: number,
  results: google.maps.DirectionsResult,
  hoursDrivingPerDay: number
): SpotInfoProps[][] {
  // set chosen detours by day to be an array of arrays of length daysDriving
  // each array will contain the detours for that day
  let detoursByDay: SpotInfoProps[][] = [];
  for (let i = 0; i < tempDaysDriving; i++) {
    detoursByDay.push(new Array<SpotInfoProps>());
  }

  // we need to add the origin as the first detour
  detoursByDay[0].push({
    _id: "origin",
    title: originName,
    description: "Origin",
    category: "Home",
    place_id: originId,
  } as SpotInfoProps);

  let runningDuration = 0;
  let day = 0;

  for (let i = 0; i < results.routes[0].legs.length; i++) {
    // find detour with min distance from results.routes[0].legs[i].end_location

    let minDistDetour = chosenDetours[0];
    let minDist = Number.MAX_VALUE;
    for (let j = 0; j < chosenDetours.length; j++) {
      const distance =
        Math.pow(
          chosenDetours[j].location.lng -
            results.routes[0].legs[i].end_location.lng(),
          2
        ) +
        Math.pow(
          chosenDetours[j].location.lat -
            results.routes[0].legs[i].end_location.lat(),
          2
        );
      if (distance < minDist) {
        minDist = distance;
        minDistDetour = chosenDetours[j];
      }
    }

    // Any leg that ends at the origin or destination should replace the minDistDetour with the origin or destination
    const distanceToOrigin =
      Math.pow(
        originValue.lng() - results.routes[0].legs[i].end_location.lng(),
        2
      ) +
      Math.pow(
        originValue.lat() - results.routes[0].legs[i].end_location.lat(),
        2
      );

    const distanceToDestination =
      Math.pow(
        destinationValue.lng() - results.routes[0].legs[i].end_location.lng(),
        2
      ) +
      Math.pow(
        destinationValue.lat() - results.routes[0].legs[i].end_location.lat(),
        2
      );

    if (distanceToOrigin < minDist) {
      minDistDetour = {
        _id: "origin",
        title: originName,
        description: "Origin",
        category: "Home",
        place_id: originId,
      } as SpotInfoProps;
      minDist = distanceToOrigin;
    }
    if (distanceToDestination < minDist) {
      minDistDetour = {
        _id: "destination",
        title: destinationName,
        description: "Destination",
        category: "Home",
        place_id: destinationId,
      } as SpotInfoProps;
      minDist = distanceToDestination;
    }

    const legDuration = results.routes[0].legs[i].duration?.value ?? 0;
    runningDuration = runningDuration + legDuration;
    while (runningDuration > hoursDrivingPerDay * 3600) {
      day++;
      runningDuration -= hoursDrivingPerDay * 3600;
    }
    detoursByDay[day].push(minDistDetour);
  }

  console.log("detoursByDay: ", detoursByDay);

  return detoursByDay;
}

export function DetourDayTabPanel(props: DetourDayTabPanelProps): JSX.Element {
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box mt={4}>
      <Typography variant="h6">A {props.daysDriving} Day Trip</Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="basic tabs example"
        >
          {props.chosenDetoursByDay.map((day, index) => {
            return (
              <Tab
                label={`Day ${index + 1}`}
                {...a11yProps(index)}
                key={index}
              />
            );
          })}
        </Tabs>
      </Box>
      {props.chosenDetoursByDay.map((day, index) => {
        return (
          <TabPanel value={tabValue} index={index} key={index}>
            <List
              dense
              sx={{
                width: "100%",
              }}
            >
              {day.map((detour, index) => {
                console.log(detour);
                return (
                  <ListItem key={detour._id + "_chosenDetourDay" + index}>
                    <ListItemButton>
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
              {day.length > 0 && (
                <Button
                  href={
                    "https://www.airbnb.com/s/United-States/homes?tab_id=home_tab&refinement_paths%5B%5D=%2Fhomes&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2023-08-01&monthly_length=3&price_filter_input_type=0&price_filter_num_nights=1&channel=EXPLORE&place_id=" +
                    day[day.length - 1].place_id +
                    "&date_picker_type=calendar&checkin=" +
                    props.startDate?.format("YYYY-MM-DD") +
                    "&checkout=" +
                    props.endDate?.format("YYYY-MM-DD") +
                    "&adults=1&query=United%20States"
                  }
                  target="_blank"
                >
                  Find places on Airbnb
                </Button>
              )}
            </List>
          </TabPanel>
        );
      })}
    </Box>
  );
}

export type DetourDayTabPanelProps = {
  daysDriving: number;
  chosenDetoursByDay: SpotInfoProps[][];
  startDate: Dayjs | null;
  endDate: Dayjs | null;
};
