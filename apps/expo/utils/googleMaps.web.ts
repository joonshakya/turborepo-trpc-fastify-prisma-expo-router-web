import Alert from "~/components/Alert";

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  const google: any;
}

export const getPlaceList = async (query: string) => {
  const placesService = new google.maps.places.PlacesService(
    document.createElement("div"),
  );
  const request = {
    query,
    fields: ["name", "geometry"],
  };

  try {
    return new Promise((resolve, reject) => {
      placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(
            results.map((result) => ({
              name: result.name,
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            })),
          );
        } else {
          reject(new Error("Error finding location"));
        }
      });
    });
  } catch (error) {
    Alert.alert("Error", "Error finding location");
    throw error;
  }
};

export const getPlaceName = async (lat: number, lng: number) => {
  try {
    const geocoder = new google.maps.Geocoder();
    const latlng = new google.maps.LatLng(lat, lng);

    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          let placeName = results[0].formatted_address;
          if (placeName.includes("+") || placeName.includes("Unnamed")) {
            placeName = results[1].formatted_address || "Unknown Place";
          }
          resolve(placeName);
        } else {
          reject(new Error("Error finding location"));
        }
      });
    });
  } catch (error) {
    Alert.alert("Error", "Error finding location");
    throw error;
  }
};
