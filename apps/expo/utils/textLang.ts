import { useBearStore } from "~/store";

export default function useTextLang() {
  const language = useBearStore((state) => state.language);
  return (en: string, np: string) => {
    return language === "en" ? en : np;
  };
}
