import { imageModel } from "./defaults";
// Direct editing accepts image_urls; no preset selection or enhancement surcharge.
// https://open.higgsfield.ai/models/marketing-studio/image/api-reference
export const marketingImage = imageModel("marketing-image", "Marketing Studio Image", {
  text: "marketing-studio/image",
  reference: "marketing-studio/image",
});
