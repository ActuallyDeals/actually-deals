import assert from "node:assert/strict";
import { attachAffiliate, cleanTrackingParams, withHttps } from "../src/lib/affiliate.ts";
import { imageFallbackChain, resolveDealImage } from "../src/lib/images.ts";
import { detectMerchant, extractMerchantProductId } from "../src/lib/merchants.ts";

assert.equal(withHttps("amazon.com/dp/B08PQ2KWHS"), "https://amazon.com/dp/B08PQ2KWHS");
assert.equal(extractMerchantProductId(withHttps("amazon.com/dp/B08PQ2KWHS"), "amazon"), "B08PQ2KWHS");

const amazon =
  "https://www.amazon.com/Instant-Pot/dp/B08PQ2KWHS?tag=other-20&th=1&psc=1&utm_source=ig&pf_rd_r=ABC&ref=sr_1_1";
assert.equal(detectMerchant(amazon), "amazon");
assert.equal(extractMerchantProductId(amazon, "amazon"), "B08PQ2KWHS");
const cleanedAmazon = cleanTrackingParams(amazon);
assert.equal(cleanedAmazon.includes("utm_source"), false);
assert.equal(cleanedAmazon.includes("pf_rd_r"), false);
assert.equal(cleanedAmazon.includes("tag="), false);

const walmart = "https://www.walmart.com/ip/Red-Bull-Sugar-Free/14898365?athcpid=1&utm_campaign=x";
assert.equal(detectMerchant(walmart), "walmart");
assert.equal(extractMerchantProductId(walmart, "walmart"), "14898365");

const target = "https://www.target.com/p/dyson-v8/-/A-54191097?clkid=abc&utm_medium=email";
assert.equal(detectMerchant(target), "target");
assert.equal(extractMerchantProductId(target, "target"), "54191097");
assert.equal(cleanTrackingParams(target).includes("clkid"), false);
assert.equal(cleanTrackingParams(target).includes("utm_medium"), false);

const depot = "https://www.homedepot.com/p/DEWALT-20V-MAX-Kit/304667167";
assert.equal(detectMerchant(depot), "home-depot");
assert.equal(extractMerchantProductId(depot, "home-depot"), "304667167");

const bestbuy = "https://www.bestbuy.com/site/sony-wh-1000xm5/6505727.p?skuId=6505727&intl=nosplash";
assert.equal(detectMerchant(bestbuy), "best-buy");
assert.equal(extractMerchantProductId(bestbuy, "best-buy"), "6505727");

process.env.AFFILIATE_AMAZON_TAG = "actuallydea07-20";
const tagged = attachAffiliate("https://www.amazon.com/dp/B08PQ2KWHS?tag=old-20&th=1", "amazon");
assert.equal(tagged.includes("tag=actuallydea07-20"), true);
assert.equal(tagged.includes("th=1"), false);

const image = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "amazon",
  merchantProductId: "B08PQ2KWHS",
});
assert.equal(image.imageTier, "cdn");
assert.equal(image.imageUrl.includes("B08PQ2KWHS"), true);

const chain = imageFallbackChain({
  scrapedImageUrl: "https://example.com/photo.jpg",
  merchant: "amazon",
  merchantProductId: "B08PQ2KWHS",
});
assert.equal(chain[0], "https://example.com/photo.jpg");
assert.equal(chain.at(-1), "/placeholders/amazon.svg");

const placeholder = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "walmart",
  merchantProductId: "14898365",
});
assert.equal(placeholder.imageTier, "placeholder");

console.log("parser verification passed");
