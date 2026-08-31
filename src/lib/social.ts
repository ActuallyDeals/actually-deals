/** House accounts. Instagram is actuallydeals_ (trailing underscore). X is @actuallydeals. */

export const SOCIAL = {
  x: {
    handle: "@actuallydeals",
    url: "https://x.com/actuallydeals",
  },
  instagram: {
    handle: "actuallydeals_",
    url: "https://www.instagram.com/actuallydeals_/",
  },
  facebook: {
    handle: "ActuallyDeals",
    url: "https://www.facebook.com/ActuallyDeals",
  },
} as const;

export const SOCIAL_SAME_AS = [SOCIAL.x.url, SOCIAL.instagram.url, SOCIAL.facebook.url] as const;
