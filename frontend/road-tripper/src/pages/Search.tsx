import { Box, Button, Container, Grid, Typography } from "@mui/material";
import { SearchBar } from "../components/SearchBar";
import { Link } from "react-router-dom";

export default function Search(): JSX.Element {
  return (
    <Container>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Typography variant="h3">Search for a Spot</Typography>
          <Typography variant="body1">
            We have thousands of unique detours, ranging from Michelin-star
            restaurants to Atlas Obscura notables to America's top event venues
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box>
            <Link to="/addSpot" style={{ textDecoration: "none" }}>
              <Button variant="contained">Suggest a new stop</Button>
            </Link>
          </Box>
        </Grid>
      </Grid>
      <SearchBar />
    </Container>
  );
}
