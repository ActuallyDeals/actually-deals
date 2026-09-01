import assert from "node:assert/strict";
import { attachAffiliate, cleanTrackingParams, withHttps } from "../src/lib/affiliate.ts";
import { imageFallbackChain, isBrandedPlaceholder, resolveDealImage } from "../src/lib/images.ts";
import { findDuplicateDeal } from "../src/lib/desk.ts";
import { dealsFromRoundupCandidates, extractRetailerCandidates, pickRetailerHref } from "../src/lib/ingest-roundup.ts";
import { detectMerchant, extractMerchantProductId } from "../src/lib/merchants.ts";
import { canonicalSourceUrl, titleFromProductUrl } from "../src/lib/parse-deal.ts";
import { giftCardFaceValue } from "../src/lib/pricing.ts";
import { isCouponOnlyDeal, isDirectRetailerListing, isRetailerShortUrl } from "../src/lib/outbound.ts";
import { socialAutoPostEnabled } from "../src/lib/social-post.ts";
import { buildFacebookPost, buildInstagramCaption, buildSocialPost } from "../src/lib/copy-engine.ts";
import { AMAZON_ASSOCIATE_DISCLOSURE, GENERIC_AFFILIATE_DISCLOSURE } from "../src/lib/disclosures.ts";

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

const pageUrl = "https://9to5toys.com/2026/09/01/iphone-17-pro-deals/";
assert.equal(
  pickRetailerHref(
    "https://9to5toys.com/goto?url=https%3A%2F%2Fwww.amazon.com%2Fdp%2FB0G467WG1C%3Ftag%3Dtoysj-20",
    pageUrl,
  )?.includes("B0G467WG1C"),
  true,
);
assert.equal(
  pickRetailerHref("/out?u=https://www.amazon.com/dp/B0G45F93BH", pageUrl)?.includes("B0G45F93BH"),
  true,
);
assert.equal(
  pickRetailerHref("https://9to5toys.com/recomm?dest=https://www.amazon.com/gp/product/B0G458PMRL", pageUrl)?.includes(
    "B0G458PMRL",
  ),
  true,
);

const html = `
<div class="post-content">
<h1>iPhone 17 Pro models drop to new Amazon all-time lows again at up to $285 off (Renewed Premium)</h1>
<ul class="wp-block-list">
<li>1TB iPhone 17 Pro Cosmic Orange <a href="https://amzn.to/4gzXuys"><strong>$1,214</strong> (Reg. $1,499 new)</a> – New all-time low</li>
<li>512GB iPhone 17 Pro Silver <a href="https://www.amazon.com/dp/B0G467WG1C?tag=toysj-20"><strong>$1,171</strong> (Reg. $1,299 new)</a></li>
<li>512GB iPhone 17 Pro Silver <a href="https://9to5toys.com/goto?url=https%3A%2F%2Fwww.amazon.com%2Fgp%2Fproduct%2FB0G467WG1C%3Ftag%3Dtoysj-20"><strong>$1,171</strong> (Reg. $1,299 new)</a></li>
</ul>
<div class="wp-block-media-text"><p><a href="https://www.amazon.com/dp/B0GJTXVN9Z?tag=toysj-20">New 2026 AirTag 2 now down as low as $20 each</a></p></div>
<div class="related-guides"><ul><li><a href="https://www.amazon.com/dp/B0D1XD1ZV3">AirPods leftover</a></li></ul></div>
<div class="author-gear"><a href="https://amzn.to/3E1qSMS">AirPods leftover</a></div>
</div>
`;
const found = extractRetailerCandidates(html, pageUrl);
assert.equal(found.length, 2);
assert.equal(found[0].currentPrice, 1214);
assert.equal(found[0].listPrice, 1499);
assert.equal(found[1].currentPrice, 1171);
assert.equal(found[1].listPrice, 1299);
assert.equal(found[0].href.includes("amzn.to/4gzXuys"), true);
assert.equal(found[1].href.includes("B0G467WG1C"), true);
assert.equal(found[1].href.includes("9to5toys.com/goto"), false);
assert.equal(found.some((item) => item.href.includes("B0GJTXVN9Z")), false);
assert.equal(found.some((item) => item.href.includes("B0D1XD1ZV3")), false);
assert.equal(found.some((item) => item.href.includes("3E1qSMS")), false);
assert.equal(/all-time low|models drop|renewed premium/i.test(found[0].title), false);
assert.equal(found[0].title.includes("1TB iPhone 17 Pro Cosmic Orange"), true);
assert.equal(found[1].title.includes("512GB iPhone 17 Pro Silver"), true);

const asins = new Set(
  found
    .map((item) => extractMerchantProductId(item.href, detectMerchant(item.href)))
    .filter((value): value is string => Boolean(value)),
);
assert.equal(asins.size, 1);
assert.equal(asins.has("B0G467WG1C"), true);

const roundupDeals = dealsFromRoundupCandidates(found);
assert.equal(roundupDeals.length, 2);
for (const deal of roundupDeals) {
  assert.equal(/toysj-20|9to5-20|tag=9to5/i.test(deal.affiliateUrl), false);
  assert.equal(deal.socialPost, "");
}
const silver = roundupDeals.find((deal) => deal.merchantProductId === "B0G467WG1C");
assert.equal(silver?.merchant, "amazon");
assert.equal(silver?.affiliateUrl.includes("tag=actuallydea07-20"), true);
assert.equal(silver?.sourceUrl, "https://www.amazon.com/dp/B0G467WG1C");
assert.equal(silver?.listPrice, 1299);
assert.equal(silver?.imageTier, "cdn");
assert.equal(silver?.imageUrl.includes("B0G467WG1C"), true);
assert.equal(silver?.bullets.length, 3);
assert.equal(/uber|doordash|grubhub|app code/i.test(silver?.bullets.join(" ") ?? ""), false);

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
      merchant: "costco",
      merchantProductId: "4000233859",
    } as never,
  ],
  "costco",
  "4000233859",
);
assert.equal(dup?.slug, "live-inkind");
assert.equal(findDuplicateDeal([dup!], "costco", "4000233859", null, "live-inkind"), null);
assert.equal(findDuplicateDeal([dup!], "ebay", "4000233859"), null);
assert.equal(findDuplicateDeal([dup!], "costco", null), null);
assert.equal(findDuplicateDeal([dup!], "costco", "4000233859", "OTHERCODE")?.slug, "live-inkind");

const codeLive = {
  slug: "doordash-save10",
  title: "DoorDash $10 off",
  merchant: "doordash",
  merchantProductId: null,
  promoCode: "SAVE10",
} as never;
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "save10")?.slug, "doordash-save10");
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "  SAVE10  ")?.slug, "doordash-save10");
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "SAVE10", "doordash-save10"), null);
assert.equal(findDuplicateDeal([codeLive], "uber", null, "SAVE10"), null);
assert.equal(findDuplicateDeal([codeLive], "doordash", null, ""), null);
assert.equal(findDuplicateDeal([codeLive], "doordash", null, "   "), null);
assert.equal(
  findDuplicateDeal([{ ...codeLive, promoCode: "" } as never], "doordash", null, "SAVE10"),
  null,
);


const newegg =
  "https://www.newegg.com/amd-ryzen-7-9800x3d/p/N82E16819113877?Item=N82E16819113877&cm_mmc=track";
assert.equal(detectMerchant(newegg), "newegg");
assert.equal(extractMerchantProductId(newegg, "newegg"), "N82E16819113877");
assert.equal(
  extractMerchantProductId("https://www.newegg.com/Product/Product.aspx?Item=9SIA19UK8T1234", "newegg"),
  "9SIA19UK8T1234",
);
assert.equal(extractMerchantProductId("https://www.newegg.com/p/pl?d=ssd", "newegg"), null);
assert.equal(titleFromProductUrl(newegg, "newegg", "N82E16819113877"), "Amd Ryzen 7 9800x3d");
assert.equal(canonicalSourceUrl("newegg", "N82E16819113877", newegg), "https://www.newegg.com/p/N82E16819113877");
assert.equal(attachAffiliate(newegg, "newegg").includes("goto."), false);
assert.equal(attachAffiliate(newegg, "newegg").includes("cm_mmc"), false);

const ebay = "https://www.ebay.com/itm/sony-wh-1000xm5/256890123456?hash=item&utm_source=x";
assert.equal(detectMerchant(ebay), "ebay");
assert.equal(detectMerchant("https://ebay.us/m/abc"), "ebay");
assert.equal(extractMerchantProductId(ebay, "ebay"), "256890123456");
assert.equal(extractMerchantProductId("https://www.ebay.com/itm/256890123456", "ebay"), "256890123456");
assert.equal(extractMerchantProductId("https://www.ebay.com/itm/not-an-id", "ebay"), null);
assert.equal(titleFromProductUrl(ebay, "ebay", "256890123456"), "Sony Wh 1000xm5");
assert.equal(canonicalSourceUrl("ebay", "256890123456", ebay), "https://www.ebay.com/itm/256890123456");
assert.equal(isRetailerShortUrl("https://ebay.us/m/abc"), true);
assert.equal(isRetailerShortUrl("https://ebay.to/xyz"), true);

const kohls = "https://www.kohls.com/product/prd-3949587/nike-air-max-90-shoes.jsp?utm_campaign=x";
assert.equal(detectMerchant(kohls), "kohls");
assert.equal(extractMerchantProductId(kohls, "kohls"), "3949587");
assert.equal(extractMerchantProductId("https://www.kohls.com/catalog.jsp?productId=3949587", "kohls"), "3949587");
assert.equal(titleFromProductUrl(kohls, "kohls", "3949587"), "Nike Air Max 90 Shoes");
assert.equal(
  canonicalSourceUrl("kohls", "3949587", kohls),
  "https://www.kohls.com/product/prd-3949587/nike-air-max-90-shoes.jsp",
);
assert.equal(
  canonicalSourceUrl("kohls", "3949587", "https://www.kohls.com/catalog.jsp?prd=3949587"),
  "https://www.kohls.com/product/prd-3949587/",
);

const dicks = "https://www.dickssportinggoods.com/p/yeti-rambler-20-oz/21218426?utm_source=x";
assert.equal(detectMerchant(dicks), "dicks");
assert.equal(extractMerchantProductId(dicks, "dicks"), "21218426");
assert.equal(
  extractMerchantProductId("https://www.dickssportinggoods.com/p/foo?sku=21NIK123", "dicks"),
  "21NIK123",
);
assert.equal(titleFromProductUrl(dicks, "dicks", "21218426"), "Yeti Rambler 20 Oz");
assert.equal(
  canonicalSourceUrl("dicks", "21218426", dicks),
  "https://www.dickssportinggoods.com/p/yeti-rambler-20-oz/21218426",
);

const office =
  "https://www.officedepot.com/a/products/1234567/HP-Black-Ink/?cm_mmc=track";
assert.equal(detectMerchant(office), "office-depot");
assert.equal(detectMerchant("https://www.officemax.com/a/products/1234567/"), "office-depot");
assert.equal(extractMerchantProductId(office, "office-depot"), "1234567");
assert.equal(titleFromProductUrl(office, "office-depot", "1234567"), "HP Black Ink");
assert.equal(
  canonicalSourceUrl("office-depot", "1234567", office),
  "https://www.officedepot.com/a/products/1234567/",
);

for (const merchant of ["newegg", "ebay", "kohls", "dicks", "office-depot", "uber", "doordash", "grubhub"] as const) {
  const image = resolveDealImage({ scrapedImageUrl: null, merchant, merchantProductId: "x" });
  assert.equal(image.imageTier, "placeholder");
  assert.equal(image.imageUrl, "/placeholders/other.svg");
}

assert.equal(detectMerchant("https://www.uber.com/us/en/eats"), "uber");
assert.equal(detectMerchant("https://www.ubereats.com/promo"), "uber");
assert.equal(detectMerchant("https://www.postmates.com/"), "uber");
assert.equal(detectMerchant("https://www.doordash.com/deals"), "doordash");
assert.equal(detectMerchant("https://www.grubhub.com/lets-eat"), "grubhub");
assert.equal(extractMerchantProductId("https://www.ubereats.com/promo", "uber"), null);
assert.equal(extractMerchantProductId("https://www.doordash.com/store/123", "doordash"), null);
assert.equal(extractMerchantProductId("https://www.grubhub.com/lets-eat", "grubhub"), null);
assert.equal(canonicalSourceUrl("uber", null, "https://www.ubereats.com/promo"), "https://www.ubereats.com/promo");
assert.equal(attachAffiliate("https://www.doordash.com/deals", "doordash").includes("goto."), false);
assert.equal(
  isCouponOnlyDeal({ promoCode: "EATS20", sourceUrl: "https://www.ubereats.com/promo", merchant: "uber" }),
  true,
);

const couponDraftInput = {
  title: "Uber Eats 20% off first order",
  merchant: "uber" as const,
  currentPrice: null,
  promoCode: "EATS20",
  slug: "uber-eats-20",
  why: "Use Get Deal so you land on the cleaned product page.",
  stack: "Free Prime shipping on eligible orders.",
};
const couponX = buildSocialPost(couponDraftInput);
assert.equal(couponX.includes("Uber Eats 20% off first order at Uber w/ code EATS20"), true);
assert.equal(couponX.includes("actuallydeals.com/deal/uber-eats-20"), true);
assert.equal(couponX.includes("#ad"), true);
assert.equal(couponX.includes("$"), false);
assert.equal(couponX.includes("Get Deal"), false);
assert.equal(couponX.includes("Prime"), false);
assert.equal(couponX.length <= 280, true);

const couponIg = buildInstagramCaption(couponDraftInput);
assert.equal(couponIg.includes("Uber Eats 20% off first order at Uber w/ code EATS20"), true);
assert.equal(couponIg.includes(GENERIC_AFFILIATE_DISCLOSURE), true);
assert.equal(couponIg.includes(AMAZON_ASSOCIATE_DISCLOSURE), false);
assert.equal(couponIg.includes("@actuallydeals_"), true);
assert.equal(couponIg.includes("actuallydeals.com/deal/uber-eats-20"), true);
assert.equal(couponIg.includes("Get Deal"), false);
assert.equal(couponIg.includes("Prime"), false);

const couponFb = buildFacebookPost(couponDraftInput);
assert.equal(couponFb.includes("Uber Eats 20% off first order at Uber w/ code EATS20"), true);
assert.equal(couponFb.includes(GENERIC_AFFILIATE_DISCLOSURE), true);
assert.equal(couponFb.includes("ActuallyDeals"), true);
assert.equal(couponFb.includes("Get Deal"), false);

const emptyTitleX = buildSocialPost({
  title: "   ",
  merchant: "doordash",
  currentPrice: null,
  promoCode: "DASH10",
});
assert.equal(emptyTitleX.includes("This deal at DoorDash w/ code DASH10"), true);
assert.equal(emptyTitleX.includes("#ad"), true);
assert.equal(emptyTitleX.includes("$"), false);

const uberNoCode = buildSocialPost({
  title: "Uber Eats weekend promo",
  merchant: "uber",
  currentPrice: null,
  slug: "uber-weekend",
});
assert.equal(uberNoCode.includes("Uber Eats weekend promo at Uber"), true);
assert.equal(uberNoCode.includes("w/ code"), false);
assert.equal(uberNoCode.includes("$"), false);

assert.equal(
  buildSocialPost({ title: "Mystery SKU", merchant: "walmart", currentPrice: null }),
  "",
);

const pricedX = buildSocialPost({
  title: "Instant Pot Duo Plus",
  merchant: "amazon",
  currentPrice: 49,
  slug: "instant-pot",
});
assert.equal(pricedX.includes("$49 Instant Pot Duo Plus at Amazon"), true);
assert.equal(pricedX.includes("w/ code"), false);

const amazonCouponIg = buildInstagramCaption({
  title: "Paper towels",
  merchant: "amazon",
  currentPrice: null,
  promoCode: "SAVE5",
});
assert.equal(amazonCouponIg.includes(AMAZON_ASSOCIATE_DISCLOSURE), true);
assert.equal(amazonCouponIg.includes(GENERIC_AFFILIATE_DISCLOSURE), false);

console.log("parser verification passed");
