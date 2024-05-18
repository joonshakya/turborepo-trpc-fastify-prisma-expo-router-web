import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

export const s3Router = createTRPCRouter({
  getSignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const REGION = process.env.AWS_REGION;
      const BUCKET = process.env.AWS_BUCKET_NAME;
      // const customDomain = "example.blr1.digitaloceanspaces.com";
      // const customDomainWithoutAgri = "blr1.digitaloceanspaces.com";
      const storageDomain = "https://example.cloudfront.net";

      const client = new S3Client({
        region: REGION,
        // endpoint: `https://${customDomainWithoutAgri}`,
      });

      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: input.fileName,
        ContentType: input.fileType,
        ACL: "public-read",
      });

      const signedUrl = await getSignedUrl(client, command, {
        expiresIn: 3600,
      });

      return {
        signedUrl,
        url: `https://${storageDomain}/${input.fileName}`,
      };
    }),
});
