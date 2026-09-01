import assert from "node:assert/strict";
import { attachAffiliate, cleanTrackingParams, withHttps } from "../src/lib/affiliate.ts";
import { imageFallbackChain, isBrandedPlaceholder, resolveDealImage } from "../src/lib/images.ts";
import { findDuplicateDeal } from "../src/lib/desk.ts";
import { extractRetailerCandidates } from "../src/lib/ingest-roundup.ts";
import { detectMerchant, extractMerchantProductId } from "../src/lib/merchants.ts";
import { canonicalSourceUrl, titleFromProductUrl } from "../src/lib/parse-deal.ts";
import { giftCardFaceValue } from "../src/lib/pricing.ts";
import { isCouponOnlyDeal, isDirectRetailerListing } from "../src/lib/outbound.ts";
import { socialAutoPostEnabled } from "../src/lib/social-post.ts";

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


const amazonCdn = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "amazon",
  merchantProductId: "B08PQ2KWHS",
});
assert.equal(amazonCdn.imageTier, "cdn");
assert.equal(isBrandedPlaceholder(amazonCdn.imageUrl), false);

const html = `
<article>
<ul class="wp-block-list">
<li>1TB iPhone 17 Pro Cosmic Orange <a href="https://amzn.to/4gzXuys"><strong>$1,214</strong> (Reg. $1,499 new)</a></li>
<li>512GB iPhone 17 Pro Silver <a href="https://www.amazon.com/dp/B0G458PMRL?tag=toysj-20"><strong>$1,171</strong> (Reg. $1,299 new)</a></li>
</ul>
<div class="author-gear"><a href="https://amzn.to/3E1qSMS">AirPods leftover</a></div>
</article>
`;
const found = extractRetailerCandidates(html, "https://9to5toys.com/2026/09/01/iphone-17-pro-deals/");
assert.equal(found.length, 2);
assert.equal(found[0].currentPrice, 1214);
assert.equal(found[0].listPrice, 1499);
assert.equal(found[1].href.includes("B0G458PMRL"), true);
assert.equal(found.some((item) => item.href.includes("3E1qSMS")), false);
assert.equal(/deal score|frontpage deal|slickdeals/i.test(found[0].title), false);

assert.equal(isDirectRetailerListing("https://9to5toys.com/2026/09/01/iphone-17-pro-deals/", "other"), false);
assert.equal(isDirectRetailerListing("https://www.amazon.com/dp/B08PQ2KWHS", "amazon"), true);
assert.equal(isCouponOnlyDeal({ promoCode: "PIZZA20", sourceUrl: "", merchant: "other" }), true);
assert.equal(
  isCouponOnlyDeal({
    promoCode: "SAVE10",
    sourceUrl: "https://www.amazon.com/dp/B08PQ2KWHS",
    merchant: "amazon",
  }),
  false,
);

delete process.env.SOCIAL_AUTO_POST;
assert.equal(socialAutoPostEnabled(), false);
process.env.SOCIAL_AUTO_POST = "true";
assert.equal(socialAutoPostEnabled(), true);
process.env.SOCIAL_AUTO_POST = "false";
assert.equal(socialAutoPostEnabled(), false);

const costco =
  "https://www.costco.com/p/-/inkind-one-egift-card-thousands-of-restaurants-100-value/4000233859?langId=-1";
assert.equal(detectMerchant(costco), "costco");
assert.equal(extractMerchantProductId(costco, "costco"), "4000233859");
assert.equal(isDirectRetailerListing(costco, "costco"), true);
assert.equal(
  isCouponOnlyDeal({ promoCode: null, sourceUrl: costco, merchant: "costco" }),
  false,
);
assert.equal(titleFromProductUrl(costco, "costco", "4000233859")?.startsWith("Inkind One eGift Card"), true);
assert.equal(giftCardFaceValue(costco), 100);
assert.equal(giftCardFaceValue("Inkind One eGift Card 100 value"), 100);
assert.equal(giftCardFaceValue("$100 restaurant card"), 100);
assert.equal(canonicalSourceUrl("costco", "4000233859", costco).includes("langId"), false);
assert.equal(canonicalSourceUrl("costco", "4000233859", costco).includes("4000233859"), true);
const costcoImage = resolveDealImage({
  scrapedImageUrl: null,
  merchant: "costco",
  merchantProductId: "4000233859",
});
assert.equal(costcoImage.imageTier, "placeholder");
assert.equal(costcoImage.imageUrl, "/placeholders/other.svg");

const dup = findDuplicateDeal(
  [
    {
      slug: "live-inkind",
      title: "Inkind One eGift Card",
      merchantProductId: "4000233859",
    } as never,
  ],
  "4000233859",
);
assert.equal(dup?.slug, "live-inkind");
assert.equal(findDuplicateDeal([dup!], "4000233859", "live-inkind"), null);

console.log("parser verification passed");
