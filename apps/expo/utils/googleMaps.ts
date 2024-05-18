import { create } from "apisauce";

import Alert from "~/components/Alert";

const googleMapsPlaceApi = create({
  baseURL: "https://maps.googleapis.com/maps/api/place",
});

const googleMapsGeocodeApi = create({
  baseURL: "https://maps.googleapis.com/maps/api/geocode",
});

export const getPlaceList = async (query: string) => {
  const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const response = await googleMapsPlaceApi.get(
    `textsearch/json?query=${query.replace(/ /g, "+")}&key=${API_KEY}`,
  );
  const data = response.data as any;
  try {
    return data.results.map((result: any) => ({
      name: result.name,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
    }));
  } catch (error) {
    Alert.alert("Error", "Error finding location");
    throw error;
  }
};

export const getPlaceName = async (lat: number, lng: number) => {
  const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  let placeName = "";
  const response = await googleMapsGeocodeApi.get(
    `json?latlng=${lat},${lng}&key=${API_KEY}&region=NP`,
  );
  const data = response.data as any;
  try {
    data.results.forEach((result) => {
      if (placeName) return;
      if (
        !result.formatted_address.includes("+") &&
        !result.formatted_address.includes("Unnamed")
      ) {
        placeName = result.formatted_address;
      }
    });
    if (!placeName) {
      placeName = data.results[0].formatted_address;
    }
  } catch (error) {
    Alert.alert("Error", "Error finding location");
    throw error;
  }

  return placeName;
};
