import axios from "axios";

export function api(url, config) {
  return axios(url, config)
    .then(result => {
      if (typeof result.data === "object") {
        return JSON.stringify(result.data, null, 2);
      } else {
        return result.data;
      }
    })
    .catch(error => {
      if (error.response) {
        if (error.response.data) {
          const data =
            typeof error.response.data === "string"
              ? error.response.data
              : JSON.stringify(error.response.data);
          error.message = data.replace(/<[^>]+>/g, " ").slice(0, 240);
        }
      }
      throw error;
    });
}
