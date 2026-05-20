import axios from "axios";
import {
  getHash,
  getIpfsCid,
  getMattersHash,
  parseFingerprintManifest
} from "../index";

jest.mock("axios");

describe("getHash", () => {
  it("extracts mediaHash from current matters.town article URLs", () => {
    expect(
      getHash(
        "https://matters.town/@leungkaichihk/%E9%A6%99%E6%B8%AF-zdpuB2J818r8yUSDeZ4vDARrnQ4ut3S2UYjALXHJ16jp25w4P"
      )
    ).toBe("zdpuB2J818r8yUSDeZ4vDARrnQ4ut3S2UYjALXHJ16jp25w4P");
  });

  it("keeps backwards compatibility with matters.news links", () => {
    expect(
      getHash(
        "https://matters.news/@deserve/example-zdpuB1bvMnsAr4APk12FmdRxcqMaEsRo46vKE7p6Arvsg4YiF"
      )
    ).toBe("zdpuB1bvMnsAr4APk12FmdRxcqMaEsRo46vKE7p6Arvsg4YiF");
  });

  it("rejects non-Matters URLs", () => {
    expect(getHash("https://example.com/@deserve/example-zdpu123")).toBe("");
  });
});

describe("getIpfsCid", () => {
  it("accepts a raw IPFS CID", () => {
    expect(getIpfsCid("QmdaT2M2sGQE6kxPbN2BztCHt7sB3sz13B8S3UVhpD64iM")).toBe(
      "QmdaT2M2sGQE6kxPbN2BztCHt7sB3sz13B8S3UVhpD64iM"
    );
  });

  it("extracts CIDs from path-style gateway URLs", () => {
    expect(
      getIpfsCid(
        "https://ipfs.io/ipfs/QmdaT2M2sGQE6kxPbN2BztCHt7sB3sz13B8S3UVhpD64iM"
      )
    ).toBe("QmdaT2M2sGQE6kxPbN2BztCHt7sB3sz13B8S3UVhpD64iM");
  });
});

describe("parseFingerprintManifest", () => {
  it("accepts lifeboat address-book JSON", () => {
    const manifest = parseFingerprintManifest(
      JSON.stringify({
        schema: "matters-lifeboat-fingerprints/v1",
        articles: [{ title: "One", dataHash: "QmHash" }]
      })
    );

    expect(manifest.articles[0].dataHash).toBe("QmHash");
  });
});

describe("getMattersHash", () => {
  beforeEach(() => {
    axios.post.mockReset();
  });

  it("posts an Apollo-compatible GraphQL request to matters.town", async () => {
    axios.post.mockResolvedValue({
      status: 200,
      data: { data: { article: { dataHash: "QmHash" } } }
    });

    await expect(
      getMattersHash({ mediaHash: "zdpuMediaHash" })
    ).resolves.toEqual({ article: { dataHash: "QmHash" } });

    expect(axios.post).toHaveBeenCalledWith(
      "https://server.matters.town/graphql",
      expect.objectContaining({
        variables: { mediaHash: "zdpuMediaHash" },
        operationName: "ArticleDataHash"
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "apollo-require-preflight": "true",
          "x-apollo-operation-name": "ArticleDataHash"
        })
      })
    );
  });

  it("supports an encoded proxy endpoint for static hosting deployments", async () => {
    axios.post.mockResolvedValue({
      status: 200,
      data: { data: { article: { dataHash: "QmHash" } } }
    });

    await getMattersHash({
      mediaHash: "zdpuMediaHash",
      cors: "https://proxy.example/?url=",
      corsNeedEncode: true
    });

    expect(axios.post.mock.calls[0][0]).toBe(
      "https://proxy.example/?url=https%3A%2F%2Fserver.matters.town%2Fgraphql"
    );
  });
});
