import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

// import { setHeaderToken } from "~/utils/trpc";
import { NotificationTypeChoice } from ".prisma/client";

const key = "authToken";
interface JwtType {
  id: string;
  noOfPasswordsChanged: number;
  iat: number;
  exp: number;
}

const storeToken = async (authToken: string) => {
  try {
    await AsyncStorage.setItem(key, authToken);
    // setHeaderToken(authToken);
  } catch (error) {
    throw new Error("Error storing the auth token");
  }
};

const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem(key);
    // setHeaderToken(token);
    return token;
  } catch (error) {
    throw new Error("Error getting the auth token");
  }
};

const getUserId = async (): Promise<any> => {
  const token = await getToken();
  if (!token) return null;

  const decodedToken = jwtDecode<JwtType>(token);
  const expired = decodedToken.exp < Date.now() / 1000;
  if (expired) {
    removeToken();
    return null;
  }
  return decodedToken.id;
};

const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    throw new Error("Error removing the auth token");
  }
};

const getDisabledNotifications = async (): Promise<
  NotificationTypeChoice[]
> => {
  try {
    const value = await AsyncStorage.getItem("disabledNotifications");
    if (!value) return [];
    return JSON.parse(value);
  } catch (error) {
    throw new Error("Error getting the compactPost");
  }
};

const setDisabledNotifications = async (value: string[]) => {
  try {
    await AsyncStorage.setItem("disabledNotifications", JSON.stringify(value));
  } catch (error) {
    throw new Error("Error storing the compactPost");
  }
};

export default {
  getToken,
  getUserId,
  removeToken,
  storeToken,
  getDisabledNotifications,
  setDisabledNotifications,
};
