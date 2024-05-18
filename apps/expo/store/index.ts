import { UserData } from "@/utils/trpcDataTypes";
import { create } from "zustand";

interface BearState {
  disabledNotifications: string[];
  setDisabledNotifications: (disabledNotifications: string[]) => void;
  loadingVisible: boolean;
  setLoadingVisible: (loadingVisible: boolean) => void;
  initialLoaded: boolean;
  setInitialLoaded: (initialLoaded: boolean) => void;
}

export const useBearStore = create<BearState>()((set, get) => ({
  disabledNotifications: [],
  setDisabledNotifications: (disabledNotifications) => {
    set({ disabledNotifications });
  },
  loadingVisible: false,
  setLoadingVisible: (loadingVisible) => set({ loadingVisible }),
  initialLoaded: false,
  setInitialLoaded: (initialLoaded) => set({ initialLoaded }),
}));

interface AuthStore {
  user: UserData | undefined;
  setUser: (user: UserData) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
}));
