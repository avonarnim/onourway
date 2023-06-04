import {
  Button,
  Card,
  CardMedia,
  Grid,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { SetStateAction, useEffect, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../core/AuthContext";
import logo250 from "../assets/logo250.png";
import { useMutation } from "../core/api";
import ProfileFormDialog from "../dialogs/EditProfileDialog";
import { TripProps } from "./EditTrip";
import {
  Edit,
  AccountCircle,
  Delete,
  ConnectingAirportsOutlined,
} from "@mui/icons-material";
import { SpotInfoProps } from "../components/SpotInfo";
import RandomTripButton from "../components/RandomTripButton";

const Img = styled("img")({
  margin: "auto",
  display: "block",
  maxWidth: "100%",
  maxHeight: "100%",
});

const generateSocialLink = (
  platform: string,
  link: string | undefined,
  src: string
) => {
  return link === undefined || link === "" ? null : (
    <Grid item>
      <Link href={link}>
        <Img sx={{ width: 24, height: 24 }} alt={platform} src={src} />
      </Link>
    </Grid>
  );
};

export function FollowingButton(props: {
  thisUserId: string;
  userId: string;
  following: string[];
}): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const followProfile = useMutation("FollowProfile");
  const unfollowProfile = useMutation("UnfollowProfile");

  return (
    <>
      {props.userId ? (
        props.following && props.following.includes(props.userId) ? (
          <Button
            variant="contained"
            color="secondary"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              console.log("unfollow");
              unfollowProfile.commit({
                profileId: props.thisUserId,
                followingId: props.userId,
              });
            }}
          >
            {isHovered ? "Unfollow" : "Following"}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              console.log("follow");
              followProfile.commit({
                profileId: props.thisUserId,
                followingId: props.userId,
              });
            }}
          >
            Follow
          </Button>
        )
      ) : (
        <></>
      )}
    </>
  );
}

export default function Profile(): JSX.Element {
  const { currentUser, updateUserProfile, setError } = useAuth();
  const props = {
    name: currentUser?.displayName,
    email: currentUser?.email,
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    twitter: "https://twitter.com/",
    youtube: "https://www.youtube.com/",
    avatar: logo250,
  };
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<ProfileProps | null>(null);
  const [thisUser, setThisUser] = useState<ProfileProps | null>(null);
  const [trips, setTrips] = useState<TripProps[] | null>(null);
  const [spots, setSpots] = useState<SpotInfoProps[] | null>(null);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  const params = useParams();

  const getProfile = useMutation("GetProfile");
  const updateProfile = useMutation("UpdateProfile");
  const getUserTrips = useMutation("GetUserTrips");
  const getSpotsList = useMutation("GetSpotsList");
  const unsaveSpot = useMutation("UnsaveSpotFromUser");

  useEffect(() => {
    console.log("params", params, currentUser?.uid);
    if ((!params.userId && currentUser) || params.userId === currentUser?.uid) {
      console.log("getting own profile");
      setUserId(currentUser.uid);
      getProfileCallback(currentUser.uid, setUser);
      getTripsCallback(currentUser.uid);
      getSpotsCallback(currentUser.uid);
    } else if (params.userId) {
      console.log("getting profile");
      setUserId(params.userId);
      getProfileCallback(params.userId, setUser);
      getProfileCallback(currentUser.uid, setThisUser);
    } else {
      console.log("no user");
    }
  }, []);

  useEffect(() => {
    setIsCurrentUser(
      (!params.userId && currentUser) || params.userId === currentUser?.uid
    );
  }, [params.userId, currentUser]);

  const getProfileCallback = async (
    userId: string,
    setter: { (value: SetStateAction<ProfileProps | null>): void }
  ) => {
    const getUserResponse = await getProfile.commit({ profileId: userId });
    setter(getUserResponse);
  };

  const getTripsCallback = async (userId: string) => {
    const getUserTripsResponse = await getUserTrips.commit({
      userId: userId,
    });
    setTrips(getUserTripsResponse);
    console.log("trips set", getUserTripsResponse);
  };

  const getSpotsCallback = async (userId: string) => {
    const getSpotsResponse = await getSpotsList.commit({
      userId: userId,
    });
    setSpots(getSpotsResponse);
    console.log("spots set", getSpotsResponse);
  };

  const removeSpot = async (spotId: string, userId: string) => {
    setSpots(spots!.filter((tempSpot) => tempSpot._id !== spotId));
    await unsaveSpot.commit({
      spotId: spotId,
      userId: userId,
    });
  };

  const instagramLink = generateSocialLink(
    "instagram",
    user?.instagram,
    "https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Instagram_colored_svg_1-1024.png"
  );
  const twitterLink = generateSocialLink(
    "twitter",
    user?.twitter,
    "https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Twitter_colored_svg-1024.png"
  );
  const youtubeLink = generateSocialLink(
    "youtube",
    user?.youtube,
    "https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Youtube_colored_svg-1024.png"
  );
  const facebookLink = generateSocialLink(
    "facebook",
    user?.facebook,
    "https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Facebook_colored_svg_copy-1024.png"
  );

  return (
    <Grid item container xs direction="row" sx={{ p: 4 }}>
      <Grid container spacing={2}>
        <Grid item>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              {user && user.image ? (
                <img
                  src={user.image}
                  alt={user.name + " profile photo"}
                  style={{
                    borderRadius: "50%",
                    width: "200px",
                    height: "200px",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <AccountCircle sx={{ fontSize: 200 }} />
              )}
            </Grid>
            <Grid item>
              {user && isCurrentUser ? (
                <ProfileFormDialog {...user} />
              ) : (
                currentUser?.uid &&
                params.userId &&
                user?.following && (
                  <FollowingButton
                    thisUserId={currentUser.uid as string}
                    userId={params.userId}
                    following={user?.following}
                  />
                )
              )}
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs sx={{ minWidth: 450 }}>
          <Typography gutterBottom variant="h4" component="div">
            {user?.name}
          </Typography>
          <Typography gutterBottom variant="h6" component="div">
            @{user?.username}
          </Typography>
          <Typography gutterBottom variant="body1" component="div">
            {user?.bio}
          </Typography>
          <Typography variant="body1">
            {user?.followers.length} Followers
          </Typography>
          <Typography variant="body1">
            {user?.following.length} Following
          </Typography>
          <Grid container direction="row" spacing={2} sx={{ pb: 4 }}>
            {facebookLink}
            {youtubeLink}
            {instagramLink}
            {twitterLink}
          </Grid>
        </Grid>
        {isCurrentUser && (
          <Grid item xs={12} md={6}>
            <Typography variant="h5">Saved Trips</Typography>
            <List>
              {trips?.map((trip) => (
                <ListItem
                  key={trip.name + trip._id}
                  secondaryAction={
                    <IconButton edge="end" aria-label="edit">
                      <Link href={`/trips/${trip._id}`}>
                        <Edit />
                      </Link>
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      trip.name +
                      (trip.description ? ": " + trip.description : "")
                    }
                    secondary={trip.originVal + " to " + trip.destinationVal}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        )}
        {isCurrentUser && (
          <Grid item xs={12} md={6}>
            <Typography variant="h5">Saved Spots</Typography>
            <List>
              {spots?.map((spot) => (
                <ListItem
                  key={spot._id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => removeSpot(spot._id, currentUser.uid)}
                    >
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={spot.title}
                    secondary={spot.description}
                  />
                </ListItem>
              ))}
            </List>
            {/* TODO: go to NewTrip page with a random set of the saved spots pre-loaded and either the current location or first spot's location set as the beginning/end */}
            {spots && spots.length > 0 && <RandomTripButton spots={spots} />}
          </Grid>
        )}
      </Grid>
    </Grid>
  );
}

export type ProfileProps = {
  _id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  image: string;
  following: string[];
  followers: string[];
  savedTripIDs: string[];
  upcomingTripsID: string[];
  savedSpots: string[];
  instagram: string;
  facebook: string;
  twitter: string;
  youtube: string;
  createdAt: number;
};
