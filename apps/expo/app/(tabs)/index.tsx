import { Image, StyleSheet } from "react-native";
import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { trpc } from "@/utils/trpc";

export default function TabOneScreen() {
  const {
    data: healthCheck,
    isLoading,
    error,
  } = trpc.healthCheck.ping.useQuery();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <Text style={styles.title}>{healthCheck}</Text>
      <Image
        source={{
          height: 100,
          width: 100,
          uri: "https://www.joonshakya.com.np/Joon.jpg",
        }}
      />
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
