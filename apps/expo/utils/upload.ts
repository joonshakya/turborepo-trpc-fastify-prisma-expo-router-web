import { manipulateAsync } from "expo-image-manipulator";
import type { AxiosProgressEvent } from "axios";
import axios, { AxiosError } from "axios";

import type { RouterInputs, RouterOutputs } from "@acme/server";

import type { ImageAssetOrString } from "../components/forms/FormImagePicker";

export const uploadImages = async (
  imageAssets: ImageAssetOrString[],
  getSignedUrl: (
    input: RouterInputs["s3"]["getSignedUrl"],
  ) => Promise<RouterOutputs["s3"]["getSignedUrl"]>,
  onUploadProgress: (progress: number) => void,
) => {
  if (typeof imageAssets === "string") {
    return imageAssets;
  }
  if (imageAssets.length === 0) {
    return [];
  }
  const imgLen = imageAssets.length;
  let totalProgress = 0;
  return Promise.all(
    imageAssets.map(async (imageAsset) => {
      if (typeof imageAsset === "string") {
        totalProgress += 1 / imgLen / 2;
        onUploadProgress(totalProgress);
        return imageAsset;
      }
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomString = Math.random().toString(36).substring(2, 7);

      const cleanFileName = imageAsset[0].fileName
        ? ((filename) =>
            (filename.slice(0, filename.lastIndexOf(".")) || filename).slice(
              0,
              100,
            ) + filename.slice(filename.lastIndexOf(".")))(
            imageAsset[0].fileName.replace(/[^a-zA-Z0-9.]/g, "-"),
          )
        : Math.random().toString(16).slice(2);

      const newFilename = `images/${date}-${randomString}-${cleanFileName}`;

      const data = await getSignedUrl({
        fileType: "image/jpg",
        fileName: newFilename,
      });

      const compressedImage = await manipulateAsync(
        imageAsset[0].uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.5 },
      );

      const res = await fetch(compressedImage.uri);
      const imageBlob = await res.blob();

      try {
        await axios.put(data.signedUrl, imageBlob, {
          onUploadProgress: (progress: AxiosProgressEvent) => {
            if (!progress.total) {
              return;
            }

            totalProgress += progress.loaded / progress.total / imgLen;
            onUploadProgress(totalProgress);
          },
          headers: {
            "Content-Type": "image/jpg",
            // "x-amz-acl": "public-read",
          },
        });
      } catch (e) {
        if (e instanceof AxiosError) {
          console.error(e.response?.data);
        }
        throw e;
      }
      return newFilename;
    }),
  );
};
