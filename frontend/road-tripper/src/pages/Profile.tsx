import { Button, Card, CardMedia, Grid, Link, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect } from "react";
import { useAuth } from "../core/AuthContext";
import logo250 from "../assets/logo250.png";

const Img = styled("img")({
  margin: "auto",
  display: "block",
  maxWidth: "100%",
  maxHeight: "100%",
});

export default function Profile(): JSX.Element {
  const { currentUser, updateUserProfile, setError } = useAuth();
  const props = {
    name: currentUser?.displayName,
    email: currentUser?.email,
    instagram: "",
    facebook: "",
    twitter: "",
    youtube: "",
    avatar: logo250,
  };

  const instagramLink =
    props.instagram === "" ? null : (
      <Grid item>
        <Link href={props.instagram}>
          <Img
            sx={{ width: 24, height: 24 }}
            alt="Instagram"
            src="https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Instagram_colored_svg_1-1024.png"
          />
        </Link>
      </Grid>
    );

  const twitterLink =
    props.twitter === "" ? null : (
      <Grid item>
        <Link href={props.twitter}>
          <Img
            sx={{ width: 24, height: 24 }}
            alt="Twitter"
            src="https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Twitter_colored_svg-1024.png"
          />
        </Link>
      </Grid>
    );

  const youtubeLink =
    props.youtube === "" ? null : (
      <Grid item>
        <Link href={props.youtube}>
          <Img
            sx={{ width: 24, height: 24 }}
            alt="YouTube"
            src="https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Youtube_colored_svg-1024.png"
          />
        </Link>
      </Grid>
    );

  const facebookLink =
    props.facebook === "" ? null : (
      <Grid item>
        <Link href={props.facebook}>
          <Img
            sx={{ width: 24, height: 24 }}
            alt="Facebook"
            src="https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Facebook_colored_svg_copy-1024.png"
          />
        </Link>
      </Grid>
    );

  return (
    <Grid item container xs direction="row" sx={{ pb: 4, mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item>
          <Grid container direction="column" spacing={2}>
            <Grid item>
              <Card sx={{ maxWidth: 345, minWidth: 240 }}>
                <CardMedia
                  component="img"
                  height="100%"
                  image={props.avatar}
                  alt="Profile Photo"
                  sx={{
                    height: 300,
                    objectFit: "contain",
                  }}
                />
              </Card>
            </Grid>
            <Grid item>
              <Button
                sx={{ minWidth: "100%" }}
                variant="outlined"
                // onClick={useOpenRightDrawer({ variant: "edit-profile" })}
              >
                Edit profile
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs sx={{ minWidth: 450 }}>
          <Typography gutterBottom variant="h4" component="div">
            {props.name}
          </Typography>
          <Grid container direction="row" spacing={2} sx={{ pb: 4 }}>
            {facebookLink}
            {youtubeLink}
            {instagramLink}
            {twitterLink}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

export type ProfileProps = {
  id: string;
  name: string;
  bio: string;
  following: string[];
  followers: string[];
  savedTrips: string[];
  upcomingTrips: string[];
  homeLongitude: string;
  homeLatitude: string;
};