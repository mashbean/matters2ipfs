import axios from "axios";
import publicCors from "../public-cors";
import Route from "route-parser";

export { api } from "./api";

export const MATTERS_GRAPHQL_ENDPOINT =
  process.env.REACT_APP_MATTERS_GRAPHQL_ENDPOINT ||
  "https://server.matters.town/graphql";

export const MATTERS_HOSTS = ["matters.town", "matters.news"];
export const CID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[ybkz][a-z2-7]{20,})$/;

export function getExtname(filename) {
  const ext = filename.split(".").pop();
  if (ext) {
    return `.${ext}`;
  }
}
export const isValidUrl = string => {
  if (!string) {
    return true;
  }
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};
export const getHash = url => {
  const urlObj = new URL(url);
  if (!MATTERS_HOSTS.includes(urlObj.hostname)) {
    return "";
  }
  const detailRoute = new Route("/@:author/:id");
  const routeMatchResult = detailRoute.match(urlObj.pathname);
  if (routeMatchResult && routeMatchResult.id) {
    const matchResult = routeMatchResult.id.match(/.+-([^-/#?]+)$/);
    if (matchResult && matchResult[1]) {
      return matchResult[1];
    } else {
      return "";
    }
  } else {
    return "";
  }
};

export const isIpfsCid = value => {
  return CID_PATTERN.test((value || "").trim());
};

export const getIpfsCid = value => {
  const input = (value || "").trim();
  if (isIpfsCid(input)) {
    return input;
  }

  try {
    const urlObj = new URL(input);
    const pathMatch = urlObj.pathname.match(/\/(?:ipfs|ipns)\/([^/?#]+)/);
    if (pathMatch && isIpfsCid(pathMatch[1])) {
      return pathMatch[1];
    }
    const subdomainMatch = urlObj.hostname.match(/^([^.]+)\.ipfs\./);
    if (subdomainMatch && isIpfsCid(subdomainMatch[1])) {
      return subdomainMatch[1];
    }
  } catch (_) {
    return "";
  }

  return "";
};

export const findFingerprint = (manifest, articleUrl) => {
  if (!manifest || !Array.isArray(manifest.articles)) {
    return null;
  }
  const mediaHash = articleUrl ? getHash(articleUrl) : "";
  return (
    manifest.articles.find(article => {
      return (
        article &&
        article.dataHash &&
        (article.sourceUrl === articleUrl ||
          (mediaHash && article.mediaHash === mediaHash))
      );
    }) || null
  );
};

export const parseFingerprintManifest = value => {
  const input = (value || "").trim();
  if (!input) {
    return null;
  }
  try {
    const parsed = JSON.parse(input);
    if (parsed && parsed.dataHash) {
      return { articles: [parsed] };
    }
    if (parsed && Array.isArray(parsed.articles)) {
      return parsed;
    }
  } catch (_) {
    return null;
  }
  return null;
};

const getEndpoint = options => {
  const mattersEndpoint = options.endpoint || MATTERS_GRAPHQL_ENDPOINT;
  if (!options.cors) {
    return mattersEndpoint;
  }
  return options.corsNeedEncode
    ? `${options.cors}${encodeURIComponent(mattersEndpoint)}`
    : `${options.cors}${mattersEndpoint}`;
};

export const getMattersHash = async options => {
  if (options && options.mediaHash) {
    const corsIndex = options.corsIndex;
    if (!options.cors && corsIndex !== undefined && corsIndex !== null) {
      const finalCorsIndex =
        corsIndex >= 0 && corsIndex < publicCors.length
          ? corsIndex
          : Math.floor(Math.random() * publicCors.length);
      const theCorsApi = publicCors[finalCorsIndex];
      options = {
        ...options,
        cors: theCorsApi.url,
        corsNeedEncode: theCorsApi.needEncode
      };
    }
    const query = /* GraphQL */ `
    query ArticleDataHash($mediaHash: String!) {
      article(input: { mediaHash: $mediaHash }) {
        dataHash
        mediaHash
        title
      }
    }
  `;
    const endpoint = getEndpoint(options);
    const config = Object.assign({}, options.config);
    const data = await axios.post(
      endpoint,
      {
        query,
        variables: { mediaHash: options.mediaHash },
        operationName: "ArticleDataHash"
      },
      {
        ...config,
        headers: {
          "content-type": "application/json",
          "apollo-require-preflight": "true",
          "x-apollo-operation-name": "ArticleDataHash",
          ...(config.headers || {})
        }
      }
    );
    if (data.status === 200 && data.data && data.data.data) {
      return data.data.data;
    } else {
      throw new Error(
        `Can't get data hash, this may cause by matters server change their api, please let me know.`
      );
    }
  } else {
    throw new Error(`Can't found mediaHash`);
  }
};
