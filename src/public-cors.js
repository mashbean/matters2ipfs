// avaliable cors proxy:
// https://ovsoinc.github.io/yacdn.org/
// https://jsonp.afeld.me/
export default [
  {
    url: "https://cors-anywhere.herokuapp.com/"
  }, // 2.79s, too many use, may be slowly
  //   {
  //     url: "https://thingproxy.freeboard.io/fetch/"
  //   }, // 2.98s; can fail in production with 401 responses
  {
    url: "https://api.allorigins.win/raw?url=",
    needEncode: true
  }, // 2.02s
  {
    url: "https://jsonp.afeld.me/?url=",
    needEncode: true
  } // 4.01s
];
