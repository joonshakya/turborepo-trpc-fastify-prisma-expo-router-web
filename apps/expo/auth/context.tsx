import { ReactNode, useEffect } from "react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

import Alert from "~/components/Alert";
import { RouterOutputs, trpc } from "~/utils/trpc";
import { useAuthStore, useBearStore } from "../store";
import authStorage from "../utils/storage";
import { NotificationTypeChoice } from ".prisma/client";

export type UserData = RouterOutputs["user"]["me"];

export default function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setInitialLoaded = useBearStore((state) => state.setInitialLoaded);

  const { data, error, refetch } = trpc.user.me.useQuery();

  useEffect(() => {
    if (data !== undefined) {
      setUser(data);
      setInitialLoaded(true);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      Alert.alert(
        "No Internet Connection",
        "Please check your internet connection and try again",
        [
          {
            text: "Try Again",
            onPress: () => refetch(),
          },
        ],
      );
    }
  }, [error]);

  // trpc.useUtils().invalidate();
  useEffect(() => {
    //clearcache
  }, [user]);

  return <>{children}</>;
}

export function useAuthContext() {
  const { mutate: removeNotificationId } =
    trpc.user.removeNotificationId.useMutation();

  const setLoadingVisible = useBearStore((state) => state.setLoadingVisible);
  const setUser = useAuthStore((state) => state.setUser);

  const login = (loginData: RouterOutputs["user"]["login"]) => {
    setLoadingVisible(true);
    authStorage.storeToken(loginData.token);
    setTimeout(() => {
      setUser(loginData.user);
    }, 600);
  };

  const logout = async () => {
    try {
      removeNotificationId(
        {
          notificationId: (
            await Notifications.getExpoPushTokenAsync({
              projectId: Constants.expoConfig?.extra?.eas.projectId,
            })
          ).data,
        },
        {
          onSettled: () => {
            setLoadingVisible(true);
            setTimeout(() => setUser(null), 600);
            authStorage.removeToken();
          },
        },
      );
    } catch (error) {
      setLoadingVisible(true);
      setTimeout(() => setUser(null), 600);
      authStorage.removeToken();
    }
  };

  const setDisabledNotifications = (
    disabledNotifications: NotificationTypeChoice[],
  ) => {
    authStorage.setDisabledNotifications(disabledNotifications);
    const user = useAuthStore.getState().user;
    if (!user) return;
    setUser({
      ...user,
      disabledNotifications,
    });
  };

  return {
    login,
    logout,
    setDisabledNotifications,
  };
}
